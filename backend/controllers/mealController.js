const Meal = require('../models/Meal');
const User = require('../models/User');

// ─── قاعدة بيانات الأطعمة الشائعة (AI محلي) ───────────
const FOOD_DB = {
  // إفطار
  'شكشوكة': { calories:420, protein:18, carbs:22, fat:28, saturatedFat:8, fiber:3, sugar:8, addedSugar:0, sodium:680, nameEn:'Shakshuka' },
  'بيض مقلي': { calories:180, protein:12, carbs:1, fat:14, saturatedFat:4, fiber:0, sugar:0, addedSugar:0, sodium:340, nameEn:'Fried Eggs' },
  'فول مدمس': { calories:280, protein:15, carbs:38, fat:6, saturatedFat:1, fiber:11, sugar:4, addedSugar:0, sodium:520, nameEn:'Fava Beans' },
  // غداء
  'أرز أبيض': { calories:130, protein:2.7, carbs:28, fat:0.3, saturatedFat:0, fiber:0.4, sugar:0, addedSugar:0, sodium:5, nameEn:'White Rice' },
  'أرز بني': { calories:112, protein:2.6, carbs:24, fat:0.9, saturatedFat:0.2, fiber:1.8, sugar:0, addedSugar:0, sodium:5, nameEn:'Brown Rice' },
  'دجاج مشوي': { calories:165, protein:31, carbs:0, fat:3.6, saturatedFat:1, fiber:0, sugar:0, addedSugar:0, sodium:74, nameEn:'Grilled Chicken' },
  'دجاج مقلي': { calories:240, protein:23, carbs:9, fat:13, saturatedFat:3.5, fiber:0.4, sugar:0, addedSugar:0, sodium:290, nameEn:'Fried Chicken' },
  'سمك مشوي': { calories:136, protein:27, carbs:0, fat:2.9, saturatedFat:0.8, fiber:0, sugar:0, addedSugar:0, sodium:65, nameEn:'Grilled Fish' },
  'لحم مفروم': { calories:215, protein:21, carbs:0, fat:14, saturatedFat:5.5, fiber:0, sugar:0, addedSugar:0, sodium:80, nameEn:'Ground Beef' },
  'مكرونة بولونيز': { calories:194, protein:9.5, carbs:29, fat:5, saturatedFat:2, fiber:2, sugar:4, addedSugar:1, sodium:185, nameEn:'Pasta Bolognese' },
  'برجر': { calories:295, protein:17, carbs:24, fat:14, saturatedFat:5, fiber:1.5, sugar:6, addedSugar:2, sodium:420, nameEn:'Burger' },
  'بيتزا': { calories:266, protein:11, carbs:33, fat:10, saturatedFat:4.5, fiber:2.3, sugar:3.6, addedSugar:1, sodium:598, nameEn:'Pizza' },
  // سلطات
  'سلطة خضراء': { calories:65, protein:2, carbs:8, fat:3.5, saturatedFat:0.5, fiber:3, sugar:4, addedSugar:0, sodium:120, nameEn:'Green Salad' },
  'تبولة': { calories:80, protein:2, carbs:12, fat:3, saturatedFat:0.4, fiber:2, sugar:2, addedSugar:0, sodium:85, nameEn:'Tabbouleh' },
  // فواكه وخضار
  'تفاح': { calories:52, protein:0.3, carbs:14, fat:0.2, saturatedFat:0, fiber:2.4, sugar:10, addedSugar:0, sodium:1, nameEn:'Apple' },
  'موز': { calories:89, protein:1.1, carbs:23, fat:0.3, saturatedFat:0.1, fiber:2.6, sugar:12, addedSugar:0, sodium:1, nameEn:'Banana' },
  'برتقال': { calories:47, protein:0.9, carbs:12, fat:0.1, saturatedFat:0, fiber:2.4, sugar:9, addedSugar:0, sodium:0, nameEn:'Orange' },
  // مشروبات
  'عصير برتقال': { calories:112, protein:1.7, carbs:26, fat:0.5, saturatedFat:0.1, fiber:0.5, sugar:21, addedSugar:0, sodium:2, nameEn:'Orange Juice' },
  'حليب': { calories:61, protein:3.2, carbs:4.8, fat:3.3, saturatedFat:1.9, fiber:0, sugar:5, addedSugar:0, sodium:44, nameEn:'Milk' },
  'قهوة': { calories:2, protein:0.3, carbs:0, fat:0, saturatedFat:0, fiber:0, sugar:0, addedSugar:0, sodium:5, nameEn:'Coffee' },
  // مكسرات
  'لوز': { calories:579, protein:21, carbs:22, fat:50, saturatedFat:3.8, fiber:12.5, sugar:4.4, addedSugar:0, sodium:1, nameEn:'Almonds' },
  // حلويات
  'شوكولاتة': { calories:546, protein:5, carbs:60, fat:31, saturatedFat:18, fiber:7, sugar:48, addedSugar:38, sodium:24, nameEn:'Chocolate' },
};

// ─── AI Analysis (محاكاة ذكاء اصطناعي محلي) ──────────
const analyzeByName = (foodName) => {
  const lower = foodName.toLowerCase().trim();

  // البحث المباشر
  if (FOOD_DB[foodName]) return { ...FOOD_DB[foodName], confidence: 95 };

  // البحث الجزئي
  for (const [key, val] of Object.entries(FOOD_DB)) {
    if (lower.includes(key) || key.includes(foodName)) {
      return { ...val, confidence: 75 };
    }
  }

  // قيمة افتراضية ذكية
  return {
    calories: 200, protein: 10, carbs: 25, fat: 8,
    saturatedFat: 2, fiber: 2, sugar: 5, addedSugar: 1,
    sodium: 150, confidence: 40, nameEn: foodName
  };
};

// ─── إضافة وجبة ───────────────────────────────────────
exports.addMeal = async (req, res, next) => {
  try {
    const { name, mealType, portion, loggedAt, notes } = req.body;
    let { nutrition } = req.body;

    // إذا لم تُرسل القيم الغذائية، استخدم قاعدة البيانات المحلية
    if (!nutrition || !nutrition.calories) {
      const analyzed = analyzeByName(name);
      const factor = (portion || 100) / 100;
      nutrition = {};
      const { confidence, nameEn, ...macros } = analyzed;
      Object.keys(macros).forEach(k => { nutrition[k] = Math.round(macros[k] * factor * 10) / 10; });
    }

    const meal = await Meal.create({
      user: req.user._id,
      name, mealType, portion: portion || 100,
      nutrition, notes,
      loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
    });

    // تحديث إحصاءات المستخدم
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.totalMeals': 1 } });

    res.status(201).json({ success: true, message: 'تم حفظ الوجبة ✅', meal });
  } catch (err) { next(err); }
};

// ─── وجبات يوم محدد ───────────────────────────────────
exports.getDayMeals = async (req, res, next) => {
  try {
    const dateKey = req.params.date || new Date().toISOString().split('T')[0];
    const meals = await Meal.find({ user: req.user._id, dateKey }).sort('loggedAt');

    // ملخص اليوم
    const summary = meals.reduce((acc, m) => {
      acc.calories   += m.nutrition.calories   || 0;
      acc.protein    += m.nutrition.protein    || 0;
      acc.carbs      += m.nutrition.carbs      || 0;
      fat:            acc.fat += m.nutrition.fat || 0;
      acc.fat        += m.nutrition.fat        || 0;
      acc.sugar      += m.nutrition.sugar      || 0;
      acc.addedSugar += m.nutrition.addedSugar || 0;
      acc.fiber      += m.nutrition.fiber      || 0;
      return acc;
    }, { calories:0, protein:0, carbs:0, fat:0, sugar:0, addedSugar:0, fiber:0 });

    // حساب نسب الأهداف
    const targets = req.user.targets || {};
    summary.caloriePct = targets.calories ? Math.round((summary.calories / targets.calories) * 100) : 0;

    res.json({ success: true, date: dateKey, meals, summary, targets });
  } catch (err) { next(err); }
};

// ─── حذف وجبة ─────────────────────────────────────────
exports.deleteMeal = async (req, res, next) => {
  try {
    const meal = await Meal.findOne({ _id: req.params.id, user: req.user._id });
    if (!meal) return res.status(404).json({ success: false, message: 'الوجبة غير موجودة' });
    await meal.deleteOne();
    res.json({ success: true, message: 'تم حذف الوجبة' });
  } catch (err) { next(err); }
};

// ─── تحليل الطعام بالاسم (AI) ────────────────────────
exports.analyzeFood = async (req, res, next) => {
  try {
    const { foodName, portion } = req.body;
    if (!foodName) return res.status(400).json({ success: false, message: 'اسم الطعام مطلوب' });

    const analyzed = analyzeByName(foodName);
    const factor = (portion || 100) / 100;
    const nutrition = {};
    const { confidence, nameEn, ...macros } = analyzed;
    Object.keys(macros).forEach(k => { nutrition[k] = Math.round(macros[k] * factor * 10) / 10; });

    res.json({
      success: true,
      analysis: {
        detectedFood: foodName,
        nameEn: nameEn || foodName,
        portion: portion || 100,
        confidence,
        nutrition,
        recommendations: generateRecommendations(nutrition, req.user?.targets),
      }
    });
  } catch (err) { next(err); }
};

// ─── رفع صورة طعام + تحليل ───────────────────────────
exports.analyzeFoodImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'الصورة مطلوبة' });

    // محاكاة تحليل AI (يمكن ربطه بـ OpenAI Vision API لاحقاً)
    const foods = ['أرز بني مع دجاج مشوي', 'سلطة خضراء', 'شكشوكة', 'مكرونة بولونيز', 'برجر'];
    const detected = foods[Math.floor(Math.random() * foods.length)];
    const analyzed = analyzeByName(detected);

    res.json({
      success: true,
      analysis: {
        imageUrl:     req.file.path || req.file.secure_url || '',
        detectedFood: detected,
        confidence:   Math.floor(Math.random() * 20) + 75,
        nutrition:    analyzed,
        note: 'تحليل تجريبي - يمكن ربط OpenAI Vision API لتحليل أدق'
      }
    });
  } catch (err) { next(err); }
};

// ─── بحث في قاعدة بيانات الأطعمة ─────────────────────
exports.searchFood = async (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  if (!q) return res.json({ success: true, results: [] });

  const results = Object.entries(FOOD_DB)
    .filter(([name]) => name.includes(q) || (FOOD_DB[name].nameEn || '').toLowerCase().includes(q))
    .slice(0, 10)
    .map(([name, data]) => ({ name, ...data }));

  res.json({ success: true, results });
};

// ─── مساعدة: توليد توصيات ─────────────────────────────
function generateRecommendations(nutrition, targets) {
  const tips = [];
  if (!targets) return tips;
  if (nutrition.calories > targets.calories * 0.5) tips.push('⚠️ هذه الوجبة تشكل أكثر من 50% من هدفك اليومي');
  if (nutrition.protein < 20) tips.push('💪 أضف مصدر بروتين (دجاج، بيض، لوز) لتعزيز العضل');
  if (nutrition.sugar > 25) tips.push('🍬 محتوى سكر مرتفع - قلل التناول أو اختر بديلاً');
  if (nutrition.fiber < 3) tips.push('🥦 أضف خضروات لزيادة الألياف وتحسين الهضم');
  return tips;
}
