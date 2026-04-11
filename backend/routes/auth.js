const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const { requireAuth } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');
const { sendVerificationEmail } = require('../utils/mailer');
const {
  createSession,
  destroySession,
  destroyUserSessions,
} = require('../utils/sessionStore');

const router = express.Router();
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const VERIFICATION_TTL_MS = 10 * 60 * 1000;

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many login attempts from this IP. Please wait 15 minutes.',
});

const registerLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 8,
  message: 'Too many registration attempts from this IP. Please wait 15 minutes.',
});

const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters.').escape(),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 64 })
    .withMessage('Password must be 8-64 characters.')
    .matches(/[a-z]/)
    .withMessage('Password must include a lowercase letter.')
    .matches(/[A-Z]/)
    .withMessage('Password must include an uppercase letter.')
    .matches(/\d/)
    .withMessage('Password must include a number.'),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }).withMessage('Phone is too long.').escape(),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 240 }).withMessage('Address is too long.').escape(),
  body('birthday').optional({ values: 'falsy' }).isISO8601().withMessage('Birthday must be a valid date.'),
];

const verifyCodeValidation = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('code').trim().matches(/^\d{6}$/).withMessage('Verification code must be 6 digits.'),
];
const resetRequestValidation = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
];
const resetPasswordValidation = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('code').trim().matches(/^\d{6}$/).withMessage('Reset code must be 6 digits.'),
  body('password')
    .isLength({ min: 8, max: 64 })
    .withMessage('Password must be 8-64 characters.')
    .matches(/[a-z]/)
    .withMessage('Password must include a lowercase letter.')
    .matches(/[A-Z]/)
    .withMessage('Password must include an uppercase letter.')
    .matches(/\d/)
    .withMessage('Password must include a number.'),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').isLength({ min: 1 }).withMessage('Password is required.'),
];

function sendValidationErrors(req, res) {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return false;
  }

  res.status(400).json({
    message: 'Please correct the highlighted fields.',
    errors: errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    })),
  });
  return true;
}

function buildToken(user, sessionId) {
  const expiresInDays = Math.max(1, Number(process.env.JWT_EXPIRES_IN_DAYS) || 7);
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
      sid: sessionId,
    },
    process.env.JWT_SECRET || 'change-me',
    {
      subject: user._id.toString(),
      expiresIn: `${expiresInDays}d`,
      jwtid: crypto.randomUUID(),
    }
  );
}

function generateVerificationCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

router.post('/register/request-code', registerLimiter, registerValidation, async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  try {
    const email = req.body.email.toLowerCase();
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(409).json({ message: 'An account with that email already exists.' });
      return;
    }

    const code = generateVerificationCode();
    const codeHash = await bcrypt.hash(code, 10);

    await VerificationCode.deleteMany({ email, purpose: 'register' });
    await VerificationCode.create({
      email,
      codeHash,
      purpose: 'register',
      payload: {
        name: req.body.name,
        email,
        password: req.body.password,
        phone: req.body.phone || '',
        address: req.body.address || '',
        birthday: req.body.birthday || null,
      },
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
    });

    const info = await sendVerificationEmail({
      email,
      code,
      name: req.body.name,
    });

    res.status(201).json({
      message: 'Verification code sent. Enter it to complete signup.',
      email,
      developmentCodePreview: process.env.SMTP_HOST ? undefined : code,
      mailPreview: process.env.SMTP_HOST ? undefined : info.message,
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not send verification code. Please try again.' });
  }
});

router.post('/register/verify', registerLimiter, verifyCodeValidation, async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  try {
    const email = req.body.email.toLowerCase();
    const record = await VerificationCode.findOne({ email, purpose: 'register' }).sort({ createdAt: -1 });

    if (!record || record.expiresAt.getTime() < Date.now()) {
      res.status(410).json({ message: 'Verification code expired. Please request a new one.' });
      return;
    }

    const validCode = await bcrypt.compare(req.body.code, record.codeHash);

    if (!validCode) {
      res.status(400).json({ message: 'Invalid verification code.' });
      return;
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      await VerificationCode.deleteMany({ email, purpose: 'register' });
      res.status(409).json({ message: 'An account with that email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(record.payload.password, 12);
    const user = await User.create({
      name: record.payload.name,
      email,
      phone: record.payload.phone || '',
      address: record.payload.address || '',
      birthday: record.payload.birthday || null,
      passwordHash,
      emailVerified: true,
    });

    await VerificationCode.deleteMany({ email, purpose: 'register' });

    res.status(201).json({
      message: 'Registration complete. You can sign in now.',
      user: user.toSafeObject(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
});

router.post('/password/request-code', loginLimiter, resetRequestValidation, async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  try {
    const email = req.body.email.toLowerCase();
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ message: 'No account found for that email.' });
      return;
    }

    const code = generateVerificationCode();
    const codeHash = await bcrypt.hash(code, 10);

    await VerificationCode.deleteMany({ email, purpose: 'reset' });
    await VerificationCode.create({
      email,
      codeHash,
      purpose: 'reset',
      payload: {},
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
    });

    await sendVerificationEmail({
      email,
      code,
      name: user.name || 'there',
    });

    res.json({
      message: 'Reset code sent. Enter it with your new password.',
      email,
      developmentCodePreview: process.env.SMTP_HOST ? undefined : code,
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not send reset code. Please try again.' });
  }
});

router.post('/password/reset', loginLimiter, resetPasswordValidation, async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  try {
    const email = req.body.email.toLowerCase();
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ message: 'No account found for that email.' });
      return;
    }

    const record = await VerificationCode.findOne({ email, purpose: 'reset' }).sort({ createdAt: -1 });

    if (!record || record.expiresAt.getTime() < Date.now()) {
      res.status(410).json({ message: 'Reset code expired. Request a new one.' });
      return;
    }

    const validCode = await bcrypt.compare(req.body.code, record.codeHash);

    if (!validCode) {
      res.status(400).json({ message: 'Invalid reset code.' });
      return;
    }

    user.passwordHash = await bcrypt.hash(req.body.password, 12);
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
    await VerificationCode.deleteMany({ email, purpose: 'reset' });

    res.json({
      message: 'Password reset successful. You can sign in now.',
    });
  } catch (error) {
    res.status(500).json({ message: 'Password reset failed. Please try again.' });
  }
});

router.post('/login', loginLimiter, loginValidation, async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  try {
    const email = req.body.email.toLowerCase();
    const user = await User.findOne({ email });

    if (!user) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      const retryAfterMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      res.status(423).json({
        message: `Account locked due to repeated failed logins. Try again in ${retryAfterMinutes} minute(s).`,
      });
      return;
    }

    if (user.status === 'blocked') {
      res.status(403).json({ message: 'This account has been blocked by an administrator.' });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({ message: 'Please verify your email before signing in.' });
      return;
    }

    const passwordMatches = await bcrypt.compare(req.body.password, user.passwordHash);

    if (!passwordMatches) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + LOGIN_LOCK_MS);
        user.failedLoginAttempts = 0;
      }

      await user.save();
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ((req.headers['x-forwarded-for'] || req.ip || '') + '').split(',')[0].trim();
    await user.save();

    const sessionId = createSession(user);
    const token = buildToken(user, sessionId);

    res.json({
      message: 'Login successful.',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({
    user: req.user.toSafeObject(),
  });
});

router.post('/logout', requireAuth, async (req, res) => {
  destroySession(req.tokenPayload.sid);
  res.json({ message: 'Logged out successfully.' });
});

router.post('/logout-all', requireAuth, async (req, res) => {
  destroyUserSessions(req.user._id.toString());
  res.json({ message: 'All sessions closed successfully.' });
});

module.exports = router;
