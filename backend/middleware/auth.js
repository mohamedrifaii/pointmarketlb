const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getSession } = require('../utils/sessionStore');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-me');
    const session = getSession(payload.sid);

    if (!session || session.userId !== payload.sub) {
      res.status(401).json({ message: 'Session expired. Please sign in again.' });
      return;
    }

    const user = await User.findById(payload.sub);

    if (!user) {
      res.status(401).json({ message: 'User account not found.' });
      return;
    }

    if (user.status === 'blocked') {
      res.status(403).json({ message: 'Your account is blocked.' });
      return;
    }

    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required.' });
    return;
  }

  next();
}

module.exports = {
  requireAdmin,
  requireAuth,
};
