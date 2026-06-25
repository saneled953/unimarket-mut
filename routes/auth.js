// routes/auth.js - Authentication routes (MySQL)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { redirectIfLoggedIn } = require('../middleware/auth');

router.get('/login', redirectIfLoggedIn, (req, res) => {
  res.sendFile('login.html', { root: './public' });
});

router.get('/register', redirectIfLoggedIn, (req, res) => {
  res.sendFile('register.html', { root: './public' });
});

router.post('/api/auth/register', [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('student_number').trim().notEmpty().withMessage('Student number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { full_name, email, student_number, password } = req.body;

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR student_number = ?',
      [email, student_number]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email or student number already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, student_number, password_hash) VALUES (?, ?, ?, ?)',
      [full_name, email, student_number, password_hash]
    );

    req.session.userId = result.insertId;
    req.session.userName = full_name;
    res.json({ success: true, message: 'Account created successfully', redirect: '/dashboard' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

router.post('/api/auth/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    req.session.userId = user.id;
    req.session.userName = user.full_name;
    res.json({ success: true, message: 'Login successful', redirect: '/dashboard' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

router.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true, redirect: '/' }));
});

module.exports = router;
