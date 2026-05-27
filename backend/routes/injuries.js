const router = require('express').Router();
const { protect } = require('../middleware/auth');
const Injury = require('../models/Injury');

router.use(protect);

router.post('/', async (req, res, next) => {
  try {
    const injury = await Injury.create({ user: req.user._id, ...req.body });
    res.status(201).json({ success: true, message: 'تم تسجيل الإصابة', injury });
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    const injuries = await Injury.find(filter).sort({ injuredAt: -1 });
    res.json({ success: true, injuries });
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const injury = await Injury.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body, { new: true, runValidators: true }
    );
    if (!injury) return res.status(404).json({ success: false, message: 'الإصابة غير موجودة' });
    res.json({ success: true, injury });
  } catch (err) { next(err); }
});

router.post('/:id/log', async (req, res, next) => {
  try {
    const injury = await Injury.findOne({ _id: req.params.id, user: req.user._id });
    if (!injury) return res.status(404).json({ success: false, message: 'الإصابة غير موجودة' });
    injury.recoveryLog.push(req.body);
    if (req.body.recoveryPct) injury.recoveryPct = req.body.recoveryPct;
    if (req.body.painLevel)   injury.painLevel   = req.body.painLevel;
    await injury.save();
    res.json({ success: true, injury });
  } catch (err) { next(err); }
});

module.exports = router;
