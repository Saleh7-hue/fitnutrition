const jwt  = require('jsonwebtoken');
const User = require('../models/User');
module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive)
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    req.user = user; next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};