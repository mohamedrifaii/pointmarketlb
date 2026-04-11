const express = require('express');
const { query, param, body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { destroyUserSessions, countActiveSessions } = require('../utils/sessionStore');

const router = express.Router();

router.use(requireAuth, requireAdmin);

const productValidation = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Product name must be 2-120 characters.').escape(),
  body('slug').trim().isLength({ min: 2, max: 120 }).withMessage('Slug is required.').matches(/^[a-z0-9-]+$/).withMessage('Slug must use lowercase letters, numbers, and dashes.'),
  body('category')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Category is required.')
    .custom(async (value) => {
      const exists = await Category.exists({ name: value.trim() });
      if (!exists) {
        throw new Error('Category must be selected from the admin category list.');
      }
      return true;
    }),
  body('price').isFloat({ min: 0 }).withMessage('Price must be 0 or higher.'),
  body('compareAtPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Compare price must be 0 or higher.'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be 0 or higher.'),
  body('image').trim().isLength({ min: 8, max: 1000 }).withMessage('Product image URL is required.'),
  body('summary').trim().isLength({ min: 8, max: 220 }).withMessage('Summary must be 8-220 characters.').escape(),
  body('description').trim().isLength({ min: 20, max: 1500 }).withMessage('Description must be 20-1500 characters.').escape(),
  body('featured').optional().isBoolean().withMessage('Featured must be true or false.'),
];

const roleValidation = [
  param('id').isMongoId().withMessage('Invalid user id.'),
  body('role').isIn(['admin', 'user']).withMessage('Invalid role value.'),
];

const adminSetPasswordValidation = [
  param('id').isMongoId().withMessage('Invalid user id.'),
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

const categoryValidation = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Category name must be 2-80 characters.'),
];

function sendValidationErrors(req, res) {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return false;
  }

  res.status(400).json({
    message: 'Please correct the request and try again.',
    errors: errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    })),
  });
  return true;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/stats', async (req, res) => {
  const [totalUsers, activeUsers, blockedUsers, adminUsers, recentLogins, totalProducts] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'blocked' }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({
      lastLoginAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    }),
    Product.countDocuments(),
  ]);

  res.json({
    totalUsers,
    activeUsers,
    blockedUsers,
    adminUsers,
    activeSessions: countActiveSessions(),
    recentLogins,
    totalProducts,
  });
});

router.get(
  '/users',
  [
    query('search').optional().trim().isLength({ max: 80 }).withMessage('Search query is too long.').escape(),
    query('status').optional().isIn(['active', 'blocked', 'inactive']).withMessage('Invalid status filter.'),
  ],
  async (req, res) => {
    if (sendValidationErrors(req, res)) {
      return;
    }

    const filter = {};
    const { search = '', status = '' } = req.query;

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    res.json({
      users: users.map((user) => user.toSafeObject()),
    });
  }
);

router.get('/products', async (req, res) => {
  const products = await Product.find().sort({ featured: -1, createdAt: -1 });
  res.json({
    products: products.map((product) => product.toPublicObject()),
  });
});

router.get('/categories', async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json({
    categories: categories.map((category) => category.toPublicObject()),
  });
});

router.post('/categories', categoryValidation, async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  const name = req.body.name.trim();
  const existing = await Category.findOne({ name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } });
  if (existing) {
    res.status(409).json({ message: 'Category already exists.' });
    return;
  }

  const category = await Category.create({ name });
  res.status(201).json({
    message: 'Category created successfully.',
    category: category.toPublicObject(),
  });
});

router.patch('/categories/:id', [param('id').isMongoId().withMessage('Invalid category id.'), ...categoryValidation], async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404).json({ message: 'Category not found.' });
    return;
  }

  const nextName = req.body.name.trim();
  const conflicting = await Category.findOne({
    _id: { $ne: req.params.id },
    name: { $regex: `^${escapeRegex(nextName)}$`, $options: 'i' },
  });

  if (conflicting) {
    res.status(409).json({ message: 'Another category already uses this name.' });
    return;
  }

  const previousName = category.name;
  category.name = nextName;
  await category.save();

  if (previousName !== nextName) {
    await Product.updateMany({ category: previousName }, { $set: { category: nextName } });
  }

  res.json({
    message: 'Category updated successfully.',
    category: category.toPublicObject(),
  });
});

router.delete('/categories/:id', [param('id').isMongoId().withMessage('Invalid category id.')], async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404).json({ message: 'Category not found.' });
    return;
  }

  const usedCount = await Product.countDocuments({ category: category.name });
  if (usedCount > 0) {
    res.status(409).json({ message: 'Cannot delete category while products still use it.' });
    return;
  }

  await Category.findByIdAndDelete(req.params.id);
  res.json({ message: 'Category deleted successfully.' });
});

router.post('/products', productValidation, async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  const existing = await Product.findOne({ slug: req.body.slug.trim() });

  if (existing) {
    res.status(409).json({ message: 'A product with that slug already exists.' });
    return;
  }

  const product = await Product.create({
    name: req.body.name.trim(),
    slug: req.body.slug.trim(),
    category: req.body.category.trim(),
    price: Number(req.body.price),
    compareAtPrice: Number(req.body.compareAtPrice || 0),
    stock: Number(req.body.stock),
    image: req.body.image.trim(),
    summary: req.body.summary.trim(),
    description: req.body.description.trim(),
    featured: req.body.featured === true || req.body.featured === 'true',
  });

  res.status(201).json({
    message: 'Product created successfully.',
    product: product.toPublicObject(),
  });
});

router.patch('/products/:id', [param('id').isMongoId().withMessage('Invalid product id.'), ...productValidation], async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404).json({ message: 'Product not found.' });
    return;
  }

  const conflicting = await Product.findOne({ slug: req.body.slug.trim(), _id: { $ne: req.params.id } });

  if (conflicting) {
    res.status(409).json({ message: 'Another product already uses that slug.' });
    return;
  }

  product.name = req.body.name.trim();
  product.slug = req.body.slug.trim();
  product.category = req.body.category.trim();
  product.price = Number(req.body.price);
  product.compareAtPrice = Number(req.body.compareAtPrice || 0);
  product.stock = Number(req.body.stock);
  product.image = req.body.image.trim();
  product.summary = req.body.summary.trim();
  product.description = req.body.description.trim();
  product.featured = req.body.featured === true || req.body.featured === 'true';
  await product.save();

  res.json({
    message: 'Product updated successfully.',
    product: product.toPublicObject(),
  });
});

router.delete('/products/:id', [param('id').isMongoId().withMessage('Invalid product id.')], async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    res.status(404).json({ message: 'Product not found.' });
    return;
  }

  res.json({
    message: 'Product deleted successfully.',
  });
});

router.patch(
  '/users/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid user id.'),
    body('status').isIn(['active', 'blocked', 'inactive']).withMessage('Invalid status value.'),
  ],
  async (req, res) => {
    if (sendValidationErrors(req, res)) {
      return;
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (user._id.toString() === req.user._id.toString() && req.body.status !== 'active') {
      res.status(400).json({ message: 'You cannot block or deactivate your own admin account.' });
      return;
    }

    user.status = req.body.status;
    await user.save();

    if (req.body.status !== 'active') {
      destroyUserSessions(user._id.toString());
    }

    res.json({
      message: `User status updated to ${req.body.status}.`,
      user: user.toSafeObject(),
    });
  }
);

router.patch('/users/:id/role', roleValidation, async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  if (req.user._id.toString() === req.params.id && req.body.role !== 'admin') {
    res.status(400).json({ message: 'You cannot remove admin role from your own account.' });
    return;
  }

  user.role = req.body.role;
  await user.save();

  res.json({
    message: `User role updated to ${req.body.role}.`,
    user: user.toSafeObject(),
  });
});

router.patch('/users/:id/password', adminSetPasswordValidation, async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  user.passwordHash = await bcrypt.hash(req.body.password, 12);
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  destroyUserSessions(user._id.toString());

  res.json({
    message: 'Password updated successfully. User has been signed out of active sessions.',
  });
});

router.delete(
  '/users/:id',
  [param('id').isMongoId().withMessage('Invalid user id.')],
  async (req, res) => {
    if (sendValidationErrors(req, res)) {
      return;
    }

    if (req.params.id === req.user._id.toString()) {
      res.status(400).json({ message: 'You cannot delete your own admin account.' });
      return;
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    destroyUserSessions(req.params.id);

    res.json({
      message: 'User deleted successfully.',
    });
  }
);

module.exports = router;
