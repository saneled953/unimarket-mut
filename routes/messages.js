// routes/messages.js - Messaging (MySQL)
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const { createNotification } = require('./notifications');
const { sendPushToUser } = require('./push');

// GET conversations
router.get('/api/messages/conversations', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const [rows] = await pool.query(`
      SELECT m.id, m.content, m.created_at, m.is_read, m.listing_id,
        IF(m.sender_id = ?, m.receiver_id, m.sender_id) AS other_user_id,
        u.full_name AS other_user_name,
        u.profile_picture AS other_user_picture,
        l.title AS listing_title
      FROM messages m
      JOIN users u ON u.id = IF(m.sender_id = ?, m.receiver_id, m.sender_id)
      LEFT JOIN listings l ON l.id = m.listing_id
      WHERE (m.sender_id = ? OR m.receiver_id = ?)
        AND m.created_at = (
          SELECT MAX(m2.created_at) FROM messages m2
          WHERE (m2.sender_id = m.sender_id AND m2.receiver_id = m.receiver_id)
             OR (m2.sender_id = m.receiver_id AND m2.receiver_id = m.sender_id)
        )
      ORDER BY m.created_at DESC
    `, [userId, userId, userId, userId]);
    res.json({ success: true, conversations: rows });
  } catch (err) {
    console.error('Conversations error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
});

// GET messages with a user
router.get('/api/messages/unread/count', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS count FROM messages WHERE receiver_id = ? AND is_read = 0',
      [req.session.userId]
    );
    res.json({ success: true, count: rows[0].count });
  } catch (err) {
    res.status(500).json({ success: false, count: 0 });
  }
});

router.get('/api/messages/:otherUserId', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const otherId = req.params.otherUserId;
    const [rows] = await pool.query(`
      SELECT m.*, u.full_name AS sender_name, u.profile_picture AS sender_picture
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `, [userId, otherId, otherId, userId]);
    await pool.query('UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ?', [userId, otherId]);
    res.json({ success: true, messages: rows });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// POST send message
router.post('/api/messages', requireLogin, async (req, res) => {
  try {
    const { receiver_id, content, listing_id } = req.body;
    const sender_id = req.session.userId;
    if (!receiver_id || !content) return res.status(400).json({ success: false, message: 'Receiver and content required' });
    if (sender_id === parseInt(receiver_id)) return res.status(400).json({ success: false, message: 'Cannot message yourself' });
    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, content, listing_id) VALUES (?, ?, ?, ?)',
      [sender_id, receiver_id, content, listing_id || null]
    );

    // Get sender name and listing title for notification
    const [[sender]] = await pool.query('SELECT full_name FROM users WHERE id = ?', [sender_id]);
    let notifTitle = `New message from ${sender.full_name}`;
    let notifBody = content.length > 80 ? content.substring(0, 80) + '...' : content;
    let notifLink = `/messages?with=${sender_id}`;

    if (listing_id) {
      const [[listing]] = await pool.query('SELECT title FROM listings WHERE id = ?', [listing_id]).catch(() => [[null]]);
      if (listing) notifBody = `Re: "${listing.title}" — ${notifBody}`;
    }

    await createNotification(receiver_id, 'message', notifTitle, notifBody, notifLink);

    // Send browser push notification (works even when user is offline)
    await sendPushToUser(receiver_id, {
      title: notifTitle,
      body: notifBody,
      link: notifLink
    });

    res.json({ success: true, message: { id: result.insertId } });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

module.exports = router;
