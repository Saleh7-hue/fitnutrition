const router  = require('express').Router();
const protect = require('../middleware/auth');
const Workout = require('../models/Workout');

// GET /api/workouts?date=YYYY-MM-DD
router.get('/', protect, async (req, res) => {
  try {
    const query = { user: req.user._id };
    if (req.query.date) query.date = req.query.date;
    const workouts = await Workout.find(query).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, workouts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب التمارين' });
  }
});

// POST /api/workouts
router.post('/', protect, async (req, res) => {
  try {
    const workout = await Workout.create({
      ...req.body,
      user: req.user._id,
      date: req.body.date || new Date().toISOString().slice(0,10),
    });
    res.status(201).json({ success: true, workout });
  } catch (err) {
    res.status(500).json({ success: false, message: 'فشل حفظ التمرين' });
  }
});

// PATCH /api/workouts/:id
router.patch('/:id', protect, async (req, res) => {
  try {
    const workout = await Workout.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body, { new: true }
    );
    if (!workout) return res.status(404).json({ success: false, message: 'التمرين غير موجود' });
    res.json({ success: true, workout });
  } catch (err) {
    res.status(500).json({ success: false, message: 'فشل التحديث' });
  }
});

// DELETE /api/workouts/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Workout.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'تم حذف التمرين' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'فشل الحذف' });
  }
});

// GET /api/workouts/weekly-summary
router.get('/weekly-summary', protect, async (req, res) => {
  try {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0,10));
    }
    const workouts = await Workout.find({ user: req.user._id, date: { $in: days } });
    const summary  = days.map(d => {
      const w = workouts.filter(x => x.date === d);
      return {
        date: d,
        sessions: w.length,
        totalMin: w.reduce((a, x) => a + (x.durationMin||0), 0),
        totalBurned: w.reduce((a, x) => a + (x.caloriesBurned||0), 0),
      };
    });
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ' });
  }
});
module.exports = router;
