// routes/push.js - Web Push Notifications
const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const pool = require('../config/db');
const { requireLogin } = require('../middleware/auth');

webpush.setVapidDetails(
  'mailto:' + (process.env.VAPID_EMAIL || 'admin@unimarket.mut.ac.za'),
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// GET VAPID public key (needed by browser to subscribe)
router.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST save subscription from browser
router.post('/api/push/subscribe', requireLogin, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    const { p256dh, auth } = keys;
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth)`,
      [req.session.userId, endpoint, p256dh, auth]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ success: false });
  }
});

// POST unsubscribe
router.post('/api/push/unsubscribe', requireLogin, async (req, res) => {
  try {
    const { endpoint } = req.body;
    await pool.query(
      'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ? AND id > 0',
      [req.session.userId, endpoint]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Helper: send push notification to a user (called internally)
async function sendPushToUser(userId, payload) {
  try {
    const [subs] = await pool.query(
      'SELECT * FROM push_subscriptions WHERE user_id = ?', [userId]
    );
    for (const sub of subs) {
      const pushSub = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
      try {
        await webpush.sendNotification(pushSub, JSON.stringify(payload));
      } catch (err) {
        // Subscription expired — clean it up
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query('DELETE FROM push_subscriptions WHERE id = ? AND id > 0', [sub.id]);
        }
      }
    }
  } catch (err) {
    console.error('Push send error:', err);
  }
}

module.exports = { router, sendPushToUser };
