const router  = require('express').Router();
const protect = require('../middleware/auth');
const isAdmin = require('../middleware/admin');
const User    = require('../models/User');
const Meal    = require('../models/Meal');
const Workout = require('../models/Workout');
const Measurement = require('../models/Measurement');

router.use(protect, isAdmin);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, activeUsers, totalMeals, totalWorkouts] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Meal.countDocuments(),
      Workout.countDocuments(),
    ]);
    const today = new Date().toISOString().slice(0,10);
    const [todayUsers, todayMeals] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: new Date(today) } }),
      Meal.countDocuments({ date: today }),
    ]);
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d  = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0,10);
      const count = await User.countDocuments({
        createdAt: { $gte: new Date(ds + 'T00:00:00'), $lte: new Date(ds + 'T23:59:59') }
      });
      last7.push({ date: ds, count });
    }
    res.json({ success: true,
      stats: { totalUsers, activeUsers, totalMeals, totalWorkouts, todayUsers, todayMeals },
      registrationChart: last7 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/users?page=1&limit=20&search=&role=
router.get('/users', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const search = req.query.search?.trim() || '';
    const role   = req.query.role || '';
    const query  = {};
    if (search) query.$or = [{ name: new RegExp(search,'i') }, { email: new RegExp(search,'i') }];
    if (role)   query.role = role;
    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit),
      User.countDocuments(query),
    ]);
    res.json({ success: true, users, total, page, pages: Math.ceil(total/limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    const [meals, workouts, measurements] = await Promise.all([
      Meal.find({ user: user._id }).sort({ createdAt:-1 }).limit(10).lean(),
      Workout.find({ user: user._id }).sort({ createdAt:-1 }).limit(10).lean(),
      Measurement.find({ user: user._id }).sort({ date:-1 }).limit(5).lean(),
    ]);
    res.json({ success: true, user, meals, workouts, measurements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/admin/users/:id
router.patch('/users/:id', async (req, res) => {
  try {
    const allowed = ['role','isActive','name','profile'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/users/:id — deletes user + all data
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'لا يمكنك حذف حسابك الخاص' });
    const [deleted] = await Promise.all([
      User.findByIdAndDelete(req.params.id),
      Meal.deleteMany({ user: req.params.id }),
      Workout.deleteMany({ user: req.params.id }),
      Measurement.deleteMany({ user: req.params.id }),
    ]);
    if (!deleted) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    res.json({ success: true, message: 'تم حذف المستخدم وجميع بياناته نهائياً' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/broadcast
router.post('/broadcast', async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'نص الرسالة مطلوب' });
    const userCount = await User.countDocuments({ isActive: true });
    // In production: push to notification service (FCM, OneSignal, etc.)
    res.json({ success: true, message: `تم إرسال الإشعار لـ ${userCount} مستخدم نشط`, recipients: userCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/export — export all data as JSON
router.get('/export', async (req, res) => {
  try {
    const [users, meals, workouts, measurements] = await Promise.all([
      User.find().select('-password').lean(),
      Meal.find().lean(),
      Workout.find().lean(),
      Measurement.find().lean(),
    ]);
    res.setHeader('Content-Disposition', 'attachment; filename="fitnutrition-export.json"');
    res.json({ exportedAt: new Date().toISOString(), users, meals, workouts, measurements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
