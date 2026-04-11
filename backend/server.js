const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const productRoutes = require('./routes/products');
const { bootstrapAdmin } = require('./utils/bootstrapAdmin');
const { bootstrapProducts } = require('./utils/bootstrapProducts');

const app = express();
const publicDir = path.join(__dirname, 'public');
const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS blocked for this origin.'));
  },
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PointMarketLB',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use(express.static(publicDir));

const pageRoutes = {
  '/': 'index.html',
  '/products': 'products.html',
  '/product': 'product.html',
  '/cart': 'cart.html',
  '/register': 'register.html',
  '/login': 'login.html',
  '/account': 'account.html',
  '/admin': 'admin.html',
  '/admin/users': 'admin-users.html',
  '/about': 'about.html',
  '/chat': 'chat.html',
  '/contact': 'contact.html',
};

const redirects = {
  '/mobiles': '/products?category=Mobiles',
  '/tvs': '/products?category=TVs',
  '/audio': '/products?category=Audio',
  '/gaming': '/products?category=Gaming',
  '/wiring': '/products?category=Wiring',
  '/electronics': '/products?category=Electronics',
  '/home-category': '/products?category=Wiring',
  '/deals': '/products?category=Deals',
  '/checkout': '/cart',
};

Object.entries(redirects).forEach(([route, target]) => {
  app.get(route, (req, res) => {
    res.redirect(target);
  });
});

Object.entries(pageRoutes).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(publicDir, file));
  });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    await bootstrapAdmin();
    await bootstrapProducts();
    console.log('MongoDB connected');

    const port = Number(process.env.PORT) || 5000;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.log('MongoDB error:', err.message);
  });
