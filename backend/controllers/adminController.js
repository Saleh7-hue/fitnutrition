const User        = require('../models/User');
const Meal        = require('../models/Meal');
const Measurement = require('../models/Measurement');
const Workout     = require('../models/Workout');
const Injury      = require('../models/Injury');

// ─── إحصاءات عامة للداشبورد ───────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      newToday,
      totalMeals,
      totalWorkouts,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ isActive: true, role: { $ne: 'admin' } }),
      User.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) },
        role: { $ne: 'admin' }
      }),
      Meal.countDocuments(),
      Workout.countDocuments({ status: 'completed' }),
    ]);

    // نشاط آخر 7 أيام
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayKey = d.toISOString().split('T')[0];
      const count = await User.countDocuments({
        createdAt: {
          $gte: new Date(d.setHours(0,0,0,0)),
          $lte: new Date(d.setHours(23,59,59,999))
        }
      });
      last7.push({ date: dayKey, registrations: count });
    }

    // توزيع الأهداف
    const goals = await User.aggregate([
      { $match: { role: { $ne: 'admin' } } },
      { $group: { _id: '$profile.goal', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers, activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        newToday, totalMeals, totalWorkouts,
      },
      charts: { last7Registrations: last7, goalDistribution: goals }
    });
  } catch (err) { next(err); }
};

// ─── قائمة المستخدمين ─────────────────────────────────
exports.getUsers = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const filter = { role: { $ne: 'admin' } };
    if (req.query.search) {
      filter.$or = [
        { name:  { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (req.query.status === 'active')   filter.isActive = true;
    if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.goal)   filter['profile.goal'] = req.query.goal;
    if (req.query.gender) filter['profile.gender'] = req.query.gender;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -refreshTokens -passwordResetToken')
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);

    // إضافة إحصاءات لكل مستخدم
    const usersWithStats = await Promise.all(users.map(async (u) => {
      const [meals, workouts] = await Promise.all([
        Meal.countDocuments({ user: u._id }),
        Workout.countDocuments({ user: u._id, status: 'completed' })
      ]);
      return { ...u.toObject(), mealCount: meals, workoutCount: workouts };
    }));

    res.json({
      success: true,
      users: usersWithStats,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) { next(err); }
};

// ─── تفاصيل مستخدم ────────────────────────────────────
exports.getUserDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshTokens -passwordResetToken');
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

    const [meals, workouts, measurements, injuries, lastMeal] = await Promise.all([
      Meal.countDocuments({ user: user._id }),
      Workout.countDocuments({ user: user._id }),
      Measurement.countDocuments({ user: user._id }),
      Injury.countDocuments({ user: user._id, status: 'active' }),
      Meal.findOne({ user: user._id }).sort({ loggedAt: -1 }),
    ]);

    res.json({
      success: true,
      user,
      activity: { meals, workouts, measurements, activeInjuries: injuries, lastMeal }
    });
  } catch (err) { next(err); }
};

// ─── تعديل صلاحيات مستخدم ─────────────────────────────
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user','moderator'].includes(role)) {
      return res.status(400).json({ success: false, message: 'دور غير صالح' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id, { role }, { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    res.json({ success: true, message: `تم تغيير الدور إلى ${role}`, user });
  } catch (err) { next(err); }
};

// ─── تعليق / تفعيل مستخدم ─────────────────────────────
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'لا يمكن تعليق حساب مدير' });

    user.isActive = !user.isActive;
    user.refreshTokens = []; // إبطال جميع الجلسات
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: user.isActive ? 'تم تفعيل الحساب' : 'تم تعليق الحساب',
      isActive: user.isActive
    });
  } catch (err) { next(err); }
};

// ─── حذف مستخدم ───────────────────────────────────────
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'لا يمكن حذف مدير' });

    // حذف جميع بيانات المستخدم
    await Promise.all([
      Meal.deleteMany({ user: user._id }),
      Measurement.deleteMany({ user: user._id }),
      Workout.deleteMany({ user: user._id }),
      Injury.deleteMany({ user: user._id }),
      user.deleteOne()
    ]);

    res.json({ success: true, message: 'تم حذف المستخدم وجميع بياناته' });
  } catch (err) { next(err); }
};

// ─── إحصاءات المحتوى ──────────────────────────────────
exports.getContentStats = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [
      mealsToday, mealsWeek,
      workoutsToday, workoutsWeek,
      topFoods
    ] = await Promise.all([
      Meal.countDocuments({ dateKey: today }),
      Meal.countDocuments({ dateKey: { $gte: weekAgo } }),
      Workout.countDocuments({ dateKey: today, status: 'completed' }),
      Workout.countDocuments({ dateKey: { $gte: weekAgo }, status: 'completed' }),
      Meal.aggregate([
        { $group: { _id: '$name', count: { $sum: 1 }, avgCalories: { $avg: '$nutrition.calories' } } },
        { $sort: { count: -1 } }, { $limit: 10 }
      ])
    ]);

    res.json({
      success: true,
      meals:    { today: mealsToday, thisWeek: mealsWeek },
      workouts: { today: workoutsToday, thisWeek: workoutsWeek },
      topFoods
    });
  } catch (err) { next(err); }
};

// ─── تعديل كلمة مرور مستخدم ───────────────────────────
exports.resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'كلمة مرور غير صالحة' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

    user.password = newPassword;
    user.refreshTokens = [];
    await user.save();

    res.json({ success: true, message: 'تم إعادة تعيين كلمة المرور' });
  } catch (err) { next(err); }
};
