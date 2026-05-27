const router  = require('express').Router();
const protect = require('../middleware/auth');
const WaterLog = require('../models/WaterLog');

// GET /api/water/:date
router.get('/:date', protect, async (req, res) => {
  try {
    const log = await WaterLog.findOne({ user: req.user._id, date: req.params.date });
    res.json({ success: true, log: log || { cups: 0, mlTotal: 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ' });
  }
});

// GET /api/water/history/week
router.get('/history/week', protect, async (req, res) => {
  try {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0,10));
    }
    const logs = await WaterLog.find({ user: req.user._id, date: { $in: days } });
    const result = days.map(d => {
      const l = logs.find(x => x.date === d);
      return { date: d, cups: l ? l.cups : 0, ml: l ? l.mlTotal : 0 };
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ' });
  }
});

// POST /api/water
router.post('/', protect, async (req, res) => {
  try {
    const { date, cups, mlTotal } = req.body;
    const log = await WaterLog.findOneAndUpdate(
      { user: req.user._id, date },
      { cups, mlTotal: mlTotal || cups * 250, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: 'فشل حفظ الماء' });
  }
});

module.exports = router;
