const router  = require('express').Router();
const ctrl    = require('../controllers/mealController');
const { protect } = require('../middleware/auth');
const multer  = require('multer');

// إعداد رفع الصور
let upload;
try {
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  const storage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'fitnutrition/food', allowed_formats: ['jpg','png','webp','heic'], transformation: [{ width: 800, quality: 'auto' }] }
  });
  upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
} catch {
  // Fallback إذا لم يُظبط Cloudinary
  upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
}

router.get  ('/search',       protect, ctrl.searchFood);
router.post ('/analyze-name', protect, ctrl.analyzeFood);
router.post ('/analyze-image',protect, upload.single('image'), ctrl.analyzeFoodImage);

module.exports = router;
