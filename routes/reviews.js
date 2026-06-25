// routes/reviews.js - Reviews (MySQL)
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireLogin } = require('../middleware/auth');

router.get('/api/reviews/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, u.full_name AS reviewer_name, u.profile_picture AS reviewer_picture, l.title AS listing_title
      FROM reviews r
      JOIN users u ON u.id = r.reviewer_id
      LEFT JOIN listings l ON l.id = r.listing_id
      WHERE r.reviewed_user_id = ?
      ORDER BY r.created_at DESC
    `, [req.params.userId]);
    res.json({ success: true, reviews: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
});

router.post('/api/reviews', requireLogin, async (req, res) => {
  try {
    const { reviewed_user_id, listing_id, rating, comment } = req.body;
    const reviewer_id = req.session.userId;
    if (!reviewed_user_id || !rating) return res.status(400).json({ success: false, message: 'User and rating required' });
    if (reviewer_id === parseInt(reviewed_user_id)) return res.status(400).json({ success: false, message: 'Cannot review yourself' });
    if (rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'Rating must be 1-5' });

    const [existing] = await pool.query(
      'SELECT id FROM reviews WHERE reviewer_id = ? AND reviewed_user_id = ? AND listing_id <=> ?',
      [reviewer_id, reviewed_user_id, listing_id || null]
    );
    if (existing.length > 0) return res.status(400).json({ success: false, message: 'You already reviewed this user for this listing' });

    await pool.query(
      'INSERT INTO reviews (reviewer_id, reviewed_user_id, listing_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [reviewer_id, reviewed_user_id, listing_id || null, rating, comment]
    );
    await pool.query(`
      UPDATE users SET
        rating = (SELECT AVG(rating) FROM reviews WHERE reviewed_user_id = ?),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE reviewed_user_id = ?)
      WHERE id = ?
    `, [reviewed_user_id, reviewed_user_id, reviewed_user_id]);

    res.json({ success: true, message: 'Review submitted!' });
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
});

module.exports = router;
