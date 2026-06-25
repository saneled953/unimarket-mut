// routes/listings.js - Listings CRUD (MySQL)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const { requireLogin } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './public/images/uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('Only images allowed'));
  }
});

// GET search suggestions (smart search)
router.get('/api/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ suggestions: [] });

    const [rows] = await pool.query(
      `SELECT l.id, l.title, l.price, l.image_url, c.icon AS category_icon
       FROM listings l
       JOIN categories c ON l.category_id = c.id
       WHERE l.status = 'active' AND (l.title LIKE ? OR l.description LIKE ?)
       ORDER BY l.created_at DESC
       LIMIT 6`,
      [`%${q.trim()}%`, `%${q.trim()}%`]
    );
    res.json({ suggestions: rows });
  } catch (err) {
    res.status(500).json({ suggestions: [] });
  }
});

// GET all listings with filters + pagination
router.get('/api/listings', async (req, res) => {
  try {
    const { search, category, min_price, max_price, condition, sort, page } = req.query;
    const PAGE_SIZE = 12;
    const currentPage = Math.max(1, parseInt(page) || 1);
    const offset = (currentPage - 1) * PAGE_SIZE;

    let baseWhere = `WHERE l.status = 'active'`;
    const params = [];

    if (search) { baseWhere += ' AND (l.title LIKE ? OR l.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (category) { baseWhere += ' AND l.category_id = ?'; params.push(parseInt(category)); }
    if (min_price) { baseWhere += ' AND l.price >= ?'; params.push(parseFloat(min_price)); }
    if (max_price) { baseWhere += ' AND l.price <= ?'; params.push(parseFloat(max_price)); }
    if (condition) { baseWhere += ' AND l.`condition` = ?'; params.push(condition); }

    const sortMap = { newest: 'l.created_at DESC', oldest: 'l.created_at ASC', price_asc: 'l.price ASC', price_desc: 'l.price DESC' };
    const orderBy = sortMap[sort] || sortMap.newest;

    // Total count for pagination
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM listings l JOIN users u ON l.seller_id = u.id JOIN categories c ON l.category_id = c.id ${baseWhere}`,
      params
    );
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    // Paginated results
    const [rows] = await pool.query(
      `SELECT l.*, u.full_name AS seller_name, u.rating AS seller_rating,
              c.name AS category_name, c.icon AS category_icon
       FROM listings l
       JOIN users u ON l.seller_id = u.id
       JOIN categories c ON l.category_id = c.id
       ${baseWhere}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, offset]
    );

    res.json({ success: true, listings: rows, pagination: { page: currentPage, totalPages, total, pageSize: PAGE_SIZE } });
  } catch (err) {
    console.error('Get listings error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch listings' });
  }
});

// GET single listing
router.get('/api/listings/:id', async (req, res) => {
  try {
    await pool.query('UPDATE listings SET views = views + 1 WHERE id = ?', [req.params.id]);
    const [rows] = await pool.query(`
      SELECT l.*, u.full_name AS seller_name, u.email AS seller_email,
             u.rating AS seller_rating, u.total_reviews AS seller_reviews,
             u.profile_picture AS seller_picture, u.student_number,
             c.name AS category_name, c.icon AS category_icon
      FROM listings l
      JOIN users u ON l.seller_id = u.id
      JOIN categories c ON l.category_id = c.id
      WHERE l.id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Listing not found' });
    res.json({ success: true, listing: rows[0] });
  } catch (err) {
    console.error('Get listing error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch listing' });
  }
});

// POST create listing
router.post('/api/listings', requireLogin, upload.single('image'), async (req, res) => {
  try {
    const { title, description, price, category_id, condition } = req.body;
    const image_url = req.file ? `/images/uploads/${req.file.filename}` : '/images/default-listing.png';
    if (!title || !description || !price || !category_id || !condition)
      return res.status(400).json({ success: false, message: 'All fields are required' });

    const [result] = await pool.query(
      'INSERT INTO listings (seller_id, title, description, price, category_id, `condition`, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.session.userId, title, description, parseFloat(price), parseInt(category_id), condition, image_url]
    );
    res.json({ success: true, message: 'Listing created!', listing: { id: result.insertId } });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ success: false, message: 'Failed to create listing' });
  }
});

// PUT update listing
router.put('/api/listings/:id', requireLogin, async (req, res) => {
  try {
    const { title, description, price, condition, status } = req.body;
    const [check] = await pool.query('SELECT seller_id FROM listings WHERE id = ?', [req.params.id]);
    if (check.length === 0 || check[0].seller_id !== req.session.userId)
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    await pool.query(
      'UPDATE listings SET title=?, description=?, price=?, `condition`=?, status=? WHERE id=?',
      [title, description, parseFloat(price), condition, status, req.params.id]
    );
    res.json({ success: true, message: 'Listing updated' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ success: false, message: 'Failed to update listing' });
  }
});

// DELETE listing
router.delete('/api/listings/:id', requireLogin, async (req, res) => {
  try {
    const [check] = await pool.query('SELECT seller_id FROM listings WHERE id = ?', [req.params.id]);
    if (check.length === 0 || check[0].seller_id !== req.session.userId)
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    await pool.query('DELETE FROM listings WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Listing deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete listing' });
  }
});

// GET categories
router.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json({ success: true, categories: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

module.exports = router;
