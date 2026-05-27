const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User    = require('../models/User');
const protect = require('../middleware/auth');

const sign = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('الاسم مطلوب'),
  body('email').isEmail().normalizeEmail().withMessage('بريد غير صالح'),
  body('password').isLength({ min: 6 }).withMessage('كلمة المرور 6 أحرف على الأقل'),
], async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });
  try {
    const { name, email, password, weight, height, age, gender, goal, activity } = req.body;
    if (await User.findOne({ email }))
      return res.status(409).json({ success: false, message: 'البريد الإلكتروني مستخدم بالفعل' });

    // Calculate target calories (Mifflin-St Jeor)
    let targetCal = 2000;
    if (weight && height && age) {
      const bmr = gender === 'female'
        ? (10 * weight) + (6.25 * height) - (5 * age) - 161
        : (10 * weight) + (6.25 * height) - (5 * age) + 5;
      const tdee = bmr * (parseFloat(activity) || 1.55);
      const adjustments = { lose: -500, gain: 400, muscle: 300, health: 0 };
      targetCal = Math.round(tdee + (adjustments[goal] || 0));
    }

    const user = await User.create({ name, email, password,
      profile: { weight, height, age, gender: gender || 'male',
                 goal: goal || 'health', activity: parseFloat(activity) || 1.55, targetCal }
    });
    const token = sign(user._id);
    user.password = undefined;
    res.status(201).json({ success: true, token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في الخادم: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
    if (!user.isActive)
      return res.status(403).json({ success: false, message: 'الحساب موقوف. تواصل مع الإدارة' });
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    const token = sign(user._id);
    user.password = undefined;
    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json({ success: true, user: req.user }));

// PATCH /api/auth/profile
router.patch('/profile', protect, async (req, res) => {
  try {
    const allowed = ['name', 'avatar', 'profile'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'فشل التحديث' });
  }
});

// PATCH /api/auth/change-password
router.patch('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'كلمة المرور الجديدة 6 أحرف على الأقل' });
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword)))
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = router;
