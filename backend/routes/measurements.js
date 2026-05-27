const router  = require('express').Router();
const protect = require('../middleware/auth');
const Measurement = require('../models/Measurement');

// GET /api/measurements?limit=30
router.get('/', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const measurements = await Measurement.find({ user: req.user._id })
      .sort({ date: -1 }).limit(limit);
    res.json({ success: true, measurements });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب القياسات' });
  }
});

// POST /api/measurements
router.post('/', protect, async (req, res) => {
  try {
    const { weight, height } = req.body;
    let bmi = null;
    if (weight && height) {
      const h = height / 100;
      bmi = parseFloat((weight / (h * h)).toFixed(1));
    }
    const measurement = await Measurement.create({
      ...req.body, user: req.user._id, bmi,
      date: req.body.date || new Date().toISOString().slice(0,10),
    });
    // Update user profile weight
    if (weight) {
      const User = require('../models/User');
      await User.findByIdAndUpdate(req.user._id, { 'profile.weight': weight });
    }
    res.status(201).json({ success: true, measurement });
  } catch (err) {
    res.status(500).json({ success: false, message: 'فشل حفظ القياسات' });
  }
});

// DELETE /api/measurements/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Measurement.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'فشل الحذف' });
  }
});

module.exports = router;
