// routes/chatbot.js - NLP chatbot (MySQL)
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

function parseIntent(message) {
  const lower = message.toLowerCase();
  const lookingKeywords = ['looking for', 'need', 'want', 'find', 'search', 'buy', 'get', 'where can i'];
  const isLooking = lookingKeywords.some(k => lower.includes(k));

  const priceMatches = lower.match(/\d+/g);
  let maxPrice = null;
  if (priceMatches) {
    const numbers = priceMatches.map(Number).filter(n => n >= 10);
    if (numbers.length > 0) maxPrice = Math.max(...numbers);
  }

  const categoryMap = {
    'laptop': 1, 'computer': 1, 'pc': 1, 'phone': 1, 'tablet': 1, 'charger': 1, 'electronics': 1,
    'textbook': 2, 'book': 2, 'study guide': 2, 'notes': 2,
    'shirt': 3, 'pants': 3, 'jacket': 3, 'clothes': 3, 'clothing': 3,
    'desk': 4, 'chair': 4, 'furniture': 4, 'lamp': 4,
    'sport': 5, 'gym': 5, 'ball': 5, 'exercise': 5,
    'pen': 6, 'stationery': 6, 'pencil': 6, 'notebook': 6,
    'bicycle': 7, 'bike': 7, 'transport': 7,
  };
  let detectedCategory = null, categoryName = null;
  for (const [keyword, catId] of Object.entries(categoryMap)) {
    if (lower.includes(keyword)) { detectedCategory = catId; categoryName = keyword; break; }
  }

  let condition = null;
  if (lower.includes('new')) condition = 'New';
  else if (lower.includes('second hand') || lower.includes('used')) condition = 'Good';

  return { isLooking, maxPrice, detectedCategory, categoryName, condition };
}

function generateResponse(intent, listings) {
  if (!intent.isLooking && !intent.detectedCategory) {
    return { text: "Hi! 👋 I'm UniBot. Try asking me:\n• \"I need a laptop under R5000\"\n• \"Find me a programming textbook\"\n• \"Cheap furniture\"", listings: [] };
  }
  if (listings.length === 0) {
    let txt = "I couldn't find any listings";
    if (intent.categoryName) txt += ` for **${intent.categoryName}**`;
    if (intent.maxPrice) txt += ` under R${intent.maxPrice}`;
    txt += ". Try a broader search or check back later! 📦";
    return { text: txt, listings: [] };
  }
  let txt = `Found **${listings.length} item${listings.length > 1 ? 's' : ''}**`;
  if (intent.categoryName) txt += ` for **${intent.categoryName}**`;
  if (intent.maxPrice) txt += ` under **R${intent.maxPrice}**`;
  txt += ':';
  return { text: txt, listings };
}

router.post('/api/chatbot', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });

    const intent = parseIntent(message);
    let query = `
      SELECT l.id, l.title, l.price, l.\`condition\`, l.image_url, l.created_at,
             u.full_name AS seller_name, c.name AS category_name
      FROM listings l
      JOIN users u ON u.id = l.seller_id
      JOIN categories c ON c.id = l.category_id
      WHERE l.status = 'active'`;
    const params = [];

    if (intent.detectedCategory) { query += ' AND l.category_id = ?'; params.push(intent.detectedCategory); }
    if (intent.maxPrice) { query += ' AND l.price <= ?'; params.push(intent.maxPrice); }
    if (intent.condition) { query += ' AND l.`condition` = ?'; params.push(intent.condition); }
    query += ' ORDER BY l.created_at DESC LIMIT 4';

    const [rows] = await pool.query(query, params);
    const response = generateResponse(intent, rows);
    res.json({ success: true, ...response });
  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ success: false, text: 'Something went wrong. Try again!', listings: [] });
  }
});

module.exports = router;
