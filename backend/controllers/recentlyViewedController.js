const RecentlyViewed = require('../models/RecentlyViewed');
const mongoose = require('mongoose');

/** GET /recently-viewed */
exports.getRecentlyViewed = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthenticated' });
  try {
    const items = await RecentlyViewed.find({ userId })
      .sort({ viewedAt: -1 })
      .limit(20)
      .populate('productId', 'name price images');
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/** POST /recently-viewed */
exports.addOrUpdate = async (req, res) => {
  const userId = req.user?.id;
  const { productId } = req.body;
  if (!userId) return res.status(401).json({ message: 'Unauthenticated' });
  if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: 'Invalid productId' });

  try {
    await RecentlyViewed.findOneAndUpdate(
      { userId, productId },
      { $set: { viewedAt: new Date() } },
      { upsert: true, new: true }
    );

    // enforce max 20 items
    const count = await RecentlyViewed.countDocuments({ userId });
    if (count > 20) {
      const excess = count - 20;
      const oldest = await RecentlyViewed.find({ userId })
        .sort({ viewedAt: 1 })
        .limit(excess);
      await RecentlyViewed.deleteMany({ _id: { $in: oldest.map(o => o._id) } });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/** POST /recently-viewed/sync */
exports.sync = async (req, res) => {
  const userId = req.user?.id;
  const { items } = req.body; // array of { productId, viewedAt }
  if (!userId) return res.status(401).json({ message: 'Unauthenticated' });
  if (!Array.isArray(items)) return res.status(400).json({ message: 'Invalid payload' });

  try {
    const bulkOps = items.map(i => ({
      updateOne: {
        filter: { userId, productId: i.productId },
        update: { $max: { viewedAt: new Date(i.viewedAt) } },
        upsert: true,
      }
    }));
    if (bulkOps.length) await RecentlyViewed.bulkWrite(bulkOps);

    // Trim to 20 after sync
    const count = await RecentlyViewed.countDocuments({ userId });
    if (count > 20) {
      const excess = count - 20;
      const toDelete = await RecentlyViewed.find({ userId })
        .sort({ viewedAt: 1 })
        .limit(excess);
      await RecentlyViewed.deleteMany({ _id: { $in: toDelete.map(d => d._id) } });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
