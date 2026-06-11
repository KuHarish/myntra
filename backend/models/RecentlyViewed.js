// backend/models/RecentlyViewed.js
const mongoose = require('mongoose');

const RecentlyViewedSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  viewedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('RecentlyViewed', RecentlyViewedSchema);
