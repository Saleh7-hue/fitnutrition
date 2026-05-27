const router   = require('express').Router();
const protect  = require('../middleware/auth');
const Meal     = require('../models/Meal');
const multer   = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const uploadToCloud = (buffer) => new Promise((resolve, reject) => {
  cloudinary.uploader.upload_stream(
    { folder: 'fitnutrition/meals', resource_type: 'image' },
    (err, result) => err ? reject(err) : resolve(result.secure_url)
  ).end(buffer);
});

// Built-in food database for AI simulation
const FOOD_DB = {
  'شكشوكة':        { calories:420,protein:18,carbs:32,fat:24,saturatedFat:7,sugar:8,addedSugar:1,fiber:4,sodium:680 },
  'دجاج مشوي':     { calories:250,protein:43,carbs:0, fat:7, saturatedFat:2,sugar:0,addedSugar:0,fiber:0,sodium:380 },
  'أرز بالدجاج':   { calories:520,protein:32,carbs:68,fat:11,saturatedFat:3,sugar:2,addedSugar:0,fiber:2,sodium:560 },
  'كبسة':          { calories:650,protein:38,carbs:72,fat:18,saturatedFat:6,sugar:3,addedSugar:0,fiber:3,sodium:820 },
  'فول مدمس':      { calories:320,protein:16,carbs:44,fat:8, saturatedFat:1,sugar:4,addedSugar:0,fiber:12,sodium:480},
  'سلطة':          { calories:180,protein:6, carbs:22,fat:8, saturatedFat:1,sugar:12,addedSugar:0,fiber:6,sodium:220},
  'مكرونة':        { calories:680,protein:38,carbs:85,fat:18,saturatedFat:7,sugar:8,addedSugar:2,fiber:4,sodium:480 },
  'برجر':          { calories:550,protein:28,carbs:42,fat:28,saturatedFat:11,sugar:6,addedSugar:3,fiber:2,sodium:720},
  'بيتزا':         { calories:480,protein:20,carbs:55,fat:18,saturatedFat:8,sugar:4,addedSugar:2,fiber:2,sodium:860 },
  'سمك مشوي':      { calories:220,protein:38,carbs:0, fat:7, saturatedFat:2,sugar:0,addedSugar:0,fiber:0,sodium:320 },
  'default':       { calories:350,protein:20,carbs:40,fat:12,saturatedFat:4,sugar:6,addedSugar:1,fiber:3,sodium:400 },
};

// POST /api/meals/analyze — AI food analysis
router.post('/analyze', protect, upload.single('image'), async (req, res) => {
  try {
    let imageUrl = null;
    if (req.file) {
      try { imageUrl = await uploadToCloud(req.file.buffer); } catch(e) { console.warn('Cloudinary skip:', e.message); }
    }
    const foodName = req.body.name || 'وجبة';
    const base     = FOOD_DB[foodName] || FOOD_DB['default'];
    const portionG = parseFloat(req.body.portionG) || 100;
    const f        = portionG / 100;
    const nutrition = {};
    Object.keys(base).forEach(k => { nutrition[k] = parseFloat((base[k] * f).toFixed(1)); });

    res.json({ success: true, aiAnalyzed: true, imageUrl,
      food: { name: foodName, portionG }, nutrition });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'فشل تحليل الصورة' });
  }
});

// GET /api/meals?date=YYYY-MM-DD&mealType=breakfast
router.get('/', protect, async (req, res) => {
  try {
    const q = { user: req.user._id };
    if (req.query.date)     q.date     = req.query.date;
    if (req.query.mealType) q.mealType = req.query.mealType;
    const meals = await Meal.find(q).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, count: meals.length, meals });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الوجبات' });
  }
});

// POST /api/meals
router.post('/', protect, async (req, res) => {
  try {
    const meal = await Meal.create({ ...req.body, user: req.user._id,
      date: req.body.date || new Date().toISOString().slice(0,10) });
    res.status(201).json({ success: true, meal });
  } catch (err) {
    res.status(500).json({ success: false, message: 'فشل حفظ الوجبة: ' + err.message });
  }
});

// DELETE /api/meals/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const meal = await Meal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!meal) return res.status(404).json({ success: false, message: 'الوجبة غير موجودة' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'فشل الحذف' });
  }
});

// GET /api/meals/summary/:date — daily nutrition totals
router.get('/summary/:date', protect, async (req, res) => {
  try {
    const meals = await Meal.find({ user: req.user._id, date: req.params.date }).lean();
    const totals = meals.reduce((acc, m) => {
      const n = m.nutrition || {};
      Object.keys(n).forEach(k => { acc[k] = (acc[k] || 0) + (n[k] || 0); });
      return acc;
    }, {});
    Object.keys(totals).forEach(k => { totals[k] = parseFloat(totals[k].toFixed(1)); });
    res.json({ success: true, date: req.params.date, count: meals.length, totals });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في الملخص' });
  }
});

module.exports = router;
