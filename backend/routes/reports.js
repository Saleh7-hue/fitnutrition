const router  = require('express').Router();
const protect = require('../middleware/auth');
const Meal    = require('../models/Meal');
const Measurement = require('../models/Measurement');
const WaterLog    = require('../models/WaterLog');
const Workout     = require('../models/Workout');

// GET /api/reports/daily/:date
router.get('/daily/:date', protect, async (req, res) => {
  try {
    const uid  = req.user._id;
    const date = req.params.date;
    const [meals, water, workouts] = await Promise.all([
      Meal.find({ user: uid, date }).lean(),
      WaterLog.findOne({ user: uid, date }).lean(),
      Workout.find({ user: uid, date }).lean(),
    ]);
    const macros = meals.reduce((a, m) => {
      const n = m.nutrition || {};
      return {
        calories: a.calories + (n.calories||0),
        protein:  a.protein  + (n.protein||0),
        carbs:    a.carbs    + (n.carbs||0),
        fat:      a.fat      + (n.fat||0),
        sugar:    a.sugar    + (n.sugar||0),
        fiber:    a.fiber    + (n.fiber||0),
        sodium:   a.sodium   + (n.sodium||0),
      };
    }, { calories:0, protein:0, carbs:0, fat:0, sugar:0, fiber:0, sodium:0 });

    Object.keys(macros).forEach(k => { macros[k] = parseFloat(macros[k].toFixed(1)); });
    const burned    = workouts.reduce((a, w) => a + (w.caloriesBurned||0), 0);
    const targetCal = req.user.profile?.targetCal || 2000;

    res.json({
      success: true, date, macros,
      netCalories: parseFloat((macros.calories - burned).toFixed(1)),
      targetCal, caloriesPct: Math.round((macros.calories / targetCal) * 100),
      water: { cups: water?.cups||0, ml: water?.mlTotal||0 },
      workouts: workouts.length, caloriesBurned: burned, meals: meals.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/weekly?start=YYYY-MM-DD
router.get('/weekly', protect, async (req, res) => {
  try {
    const uid  = req.user._id;
    const days = [];
    const base = req.query.start ? new Date(req.query.start) : new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base); d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0,10));
    }
    const [meals, waters, workouts] = await Promise.all([
      Meal.find({ user: uid, date: { $in: days } }).lean(),
      WaterLog.find({ user: uid, date: { $in: days } }).lean(),
      Workout.find({ user: uid, date: { $in: days } }).lean(),
    ]);
    const data = days.map(d => {
      const dm  = meals.filter(m => m.date === d);
      const dw  = waters.find(w => w.date === d);
      const wo  = workouts.filter(w => w.date === d);
      const cal = dm.reduce((a,m) => a + (m.nutrition?.calories||0), 0);
      const pro = dm.reduce((a,m) => a + (m.nutrition?.protein||0), 0);
      const burn= wo.reduce((a,w) => a + (w.caloriesBurned||0), 0);
      return { date:d, calories:Math.round(cal), protein:Math.round(pro), caloriesBurned:burn, waterCups:dw?.cups||0, workouts:wo.length };
    });
    const totCal = data.reduce((a,d)=>a+d.calories,0);
    res.json({ success: true, data, avgCalories: Math.round(totCal/7), totalDays: days.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/monthly?month=YYYY-MM
router.get('/monthly', protect, async (req, res) => {
  try {
    const uid   = req.user._id;
    const month = req.query.month || new Date().toISOString().slice(0,7);
    const start = month + '-01';
    const end   = month + '-31';
    const [meals, measurements, workouts] = await Promise.all([
      Meal.find({ user: uid, date: { $gte:start, $lte:end } }).lean(),
      Measurement.find({ user: uid, date: { $gte:start, $lte:end } }).sort({ date:1 }).lean(),
      Workout.find({ user: uid, date: { $gte:start, $lte:end } }).lean(),
    ]);
    const days      = new Set(meals.map(m=>m.date)).size || 1;
    const totalCal  = meals.reduce((a,m)=>a+(m.nutrition?.calories||0),0);
    const totalProt = meals.reduce((a,m)=>a+(m.nutrition?.protein||0),0);
    const totalBurn = workouts.reduce((a,w)=>a+(w.caloriesBurned||0),0);
    const wStart    = measurements[0]?.weight;
    const wEnd      = measurements[measurements.length-1]?.weight;
    const wDelta    = wStart && wEnd ? parseFloat((wEnd - wStart).toFixed(1)) : null;
    res.json({
      success: true, month,
      totalMeals: meals.length, totalWorkouts: workouts.length,
      avgDailyCalories: Math.round(totalCal/days),
      avgDailyProtein:  Math.round(totalProt/days),
      totalCaloriesBurned: totalBurn,
      weightChange: wDelta,
      measurements: measurements.map(m=>({ date:m.date, weight:m.weight, bmi:m.bmi })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/weight-history?limit=30
router.get('/weight-history', protect, async (req, res) => {
  try {
    const limit = Math.min(90, parseInt(req.query.limit)||30);
    const data  = await Measurement.find({ user: req.user._id, weight: { $exists:true } })
      .sort({ date:-1 }).limit(limit).select('date weight bmi').lean();
    res.json({ success: true, data: data.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
