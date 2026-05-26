const User = require('../models/User');
const jwt  = require('jsonwebtoken');

// دالة إرسال Token
const sendToken = (user, statusCode, res, message = 'تم بنجاح') => {
  const accessToken  = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // حفظ refresh token في قاعدة البيانات
  user.refreshTokens.push({ token: refreshToken });
  // حذف القديمة (أكثر من 5)
  if (user.refreshTokens.length > 5) user.refreshTokens.shift();
  user.lastLogin = new Date();
  user.save({ validateBeforeSave: false });

  res.status(statusCode).json({
    success: true,
    message,
    accessToken,
    refreshToken,
    user: {
      id:       user._id,
      name:     user.name,
      email:    user.email,
      role:     user.role,
      avatar:   user.avatar,
      profile:  user.profile,
      targets:  user.targets,
      settings: user.settings,
    }
  });
};

// ─── تسجيل مستخدم جديد ────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, age, gender, weight, height, activity, goal } = req.body;

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ success: false, message: 'البريد الإلكتروني مستخدم مسبقاً' });

    const user = new User({
      name,
      email,
      password,
      profile: { age, gender, weight, height, activity, goal }
    });

    // حساب الأهداف تلقائياً
    user.calculateTargets();
    await user.save();

    sendToken(user, 201, res, `مرحباً ${name}! تم إنشاء حسابك بنجاح 🎉`);
  } catch (err) {
    next(err);
  }
};

// ─── تسجيل الدخول ─────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'البريد وكلمة المرور مطلوبان' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'بريد أو كلمة مرور غير صحيحة' });
    }

    // تحقق من القفل
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({ success: false, message: `الحساب مقفل مؤقتاً لمدة ${mins} دقيقة` });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'الحساب موقوف - تواصل مع الإدارة' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.loginAttempts = 0;
      }
      await user.save({ validateBeforeSave: false });
      return res.status(401).json({ success: false, message: 'بريد أو كلمة مرور غير صحيحة' });
    }

    // إعادة تعيين محاولات الدخول
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    sendToken(user, 200, res, `أهلاً ${user.name}! 👋`);
  } catch (err) {
    next(err);
  }
};

// ─── تحديث Token ──────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token مطلوب' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(401).json({ success: false, message: 'مستخدم غير موجود' });

    const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);
    if (!tokenExists) {
      return res.status(401).json({ success: false, message: 'Refresh token غير صالح' });
    }

    const newAccessToken = user.generateAccessToken();
    res.json({ success: true, accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Refresh token منتهي - أعد تسجيل الدخول' });
  }
};

// ─── تسجيل الخروج ─────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken && req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: { token: refreshToken } }
      });
    }
    res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
  } catch (err) { next(err); }
};

// ─── الملف الشخصي ─────────────────────────────────────
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
};

// ─── تحديث الملف الشخصي ───────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, profile, settings } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (profile) Object.assign(user.profile, profile);
    if (settings) Object.assign(user.settings, settings);

    // إعادة حساب الأهداف
    user.calculateTargets();
    await user.save();

    res.json({ success: true, message: 'تم تحديث الملف الشخصي', user });
  } catch (err) { next(err); }
};

// ─── تغيير كلمة المرور ────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
    }

    user.password = newPassword;
    user.refreshTokens = [];  // إلغاء كل الجلسات
    await user.save();

    sendToken(user, 200, res, 'تم تغيير كلمة المرور بنجاح');
  } catch (err) { next(err); }
};
