const express = require('express');
const { query, param, validationResult } = require('express-validator');

const Product = require('../models/Product');
const Category = require('../models/Category');

const router = express.Router();

function sendValidationErrors(req, res) {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return false;
  }

  res.status(400).json({
    message: errors.array()[0].msg,
  });
  return true;
}

router.get(
  '/',
  [
    query('featured').optional().isBoolean().withMessage('Invalid featured filter.'),
    query('category').optional().trim().isLength({ max: 80 }).withMessage('Invalid category.').escape(),
    query('search').optional().trim().isLength({ max: 80 }).withMessage('Search is too long.').escape(),
  ],
  async (req, res) => {
    if (sendValidationErrors(req, res)) {
      return;
    }

    const filter = {};

    if (req.query.featured === 'true') {
      filter.featured = true;
    }

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { category: { $regex: req.query.search, $options: 'i' } },
        { summary: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const products = await Product.find(filter).sort({ featured: -1, createdAt: -1 });
    res.json({
      products: products.map((product) => product.toPublicObject()),
    });
  }
);

router.get('/categories', async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });

  if (categories.length) {
    res.json({ categories: categories.map((item) => item.name) });
    return;
  }

  const fallback = await Product.distinct('category');
  res.json({ categories: fallback.sort() });
});

router.get('/:slug', [param('slug').trim().isLength({ min: 2, max: 120 }).withMessage('Invalid product.')], async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  const product = await Product.findOne({ slug: req.params.slug });

  if (!product) {
    res.status(404).json({ message: 'Product not found.' });
    return;
  }

  res.json({
    product: product.toPublicObject(),
  });
});

module.exports = router;
