// backend/routes/recentlyViewed.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/recentlyViewedController');

// GET /recently-viewed -> returns last 20 items for authenticated user
router.get('/', controller.getRecentlyViewed);

// POST /recently-viewed -> add or update a single view
router.post('/', controller.addOrUpdate);

// POST /recently-viewed/sync -> bulk sync (merge) for authenticated user
router.post('/sync', controller.sync);

module.exports = router;
