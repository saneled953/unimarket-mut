// routes/users.js - User profiles (MySQL)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary storage for avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'unimarket/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto' }]
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 }
});

router.get('/api/users/me', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, student_number, profile_picture, bio, residence, whatsapp, payment_methods, rating, total_reviews, created_at FROM users WHERE id = ?',
      [req.session.userId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

router.get('/api/users/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, student_number, profile_picture, bio,
              residence, payment_methods, rating, total_reviews, created_at
       FROM users WHERE id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    const user = rows[0];
    if (user.payment_methods && typeof user.payment_methods === 'string') {
      try { user.payment_methods = JSON.parse(user.payment_methods); } catch { user.payment_methods = []; }
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

router.get('/api/users/:id/listings', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.*, c.name AS category_name, c.icon AS category_icon
      FROM listings l
      JOIN categories c ON c.id = l.category_id
      WHERE l.seller_id = ?
      ORDER BY l.created_at DESC
    `, [req.params.id]);
    res.json({ success: true, listings: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch listings' });
  }
});

router.put('/api/users/me', requireLogin, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const { full_name, bio, residence, whatsapp, payment_methods } = req.body;
    const pmJson = payment_methods ? JSON.stringify(JSON.parse(payment_methods)) : null;

    if (req.file) {
      const profile_picture = req.file.path;
      await pool.query(
        'UPDATE users SET full_name = ?, bio = ?, residence = ?, whatsapp = ?, payment_methods = ?, profile_picture = ? WHERE id = ?',
        [full_name, bio, residence || null, whatsapp || null, pmJson, profile_picture, req.session.userId]
      );
    } else {
      await pool.query(
        'UPDATE users SET full_name = ?, bio = ?, residence = ?, whatsapp = ?, payment_methods = ? WHERE id = ?',
        [full_name, bio, residence || null, whatsapp || null, pmJson, req.session.userId]
      );
    }
    req.session.userName = full_name;
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

router.get('/api/session', (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true, userId: req.session.userId, userName: req.session.userName });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;
