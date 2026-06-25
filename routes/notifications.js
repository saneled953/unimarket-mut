// routes/notifications.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireLogin } = require('../middleware/auth');

// Helper: create a notification
async function createNotification(userId, type, title, body, link = null) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)',
      [userId, type, title, body, link]
    );
  } catch (err) {
    console.error('Notification insert error:', err);
  }
}

// GET all notifications for current user
router.get('/api/notifications', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [req.session.userId]
    );
    res.json({ success: true, notifications: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// GET unread notification count
router.get('/api/notifications/unread/count', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.session.userId]
    );
    res.json({ success: true, count: rows[0].count });
  } catch (err) {
    res.status(500).json({ success: false, count: 0 });
  }
});

// PUT mark all notifications as read
router.put('/api/notifications/read-all', requireLogin, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id > 0',
      [req.session.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// PUT mark single notification as read
router.put('/api/notifications/:id/read', requireLogin, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = { router, createNotification };
