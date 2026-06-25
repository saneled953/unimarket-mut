// server.js - UniMarket MUT - Main Server Entry Point
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'unimarket_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
  }
}));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'public/images/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/listings'));
app.use('/', require('./routes/messages'));
app.use('/', require('./routes/reviews'));
app.use('/', require('./routes/users'));
app.use('/', require('./routes/chatbot'));
app.use('/', require('./routes/notifications').router);
app.use('/', require('./routes/push').router);

// ─── Page Routes ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});
app.get('/listings', (req, res) => res.sendFile(path.join(__dirname, 'public/listings.html')));
app.get('/listing/:id', (req, res) => res.sendFile(path.join(__dirname, 'public/listing-detail.html')));
app.get('/profile/:id', (req, res) => res.sendFile(path.join(__dirname, 'public/user-profile.html')));
app.get('/sell', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public/sell.html'));
});
app.get('/messages', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public/messages.html'));
});
app.get('/profile', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public/profile.html'));
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public/404.html')));

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 UniMarket MUT is running at http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});