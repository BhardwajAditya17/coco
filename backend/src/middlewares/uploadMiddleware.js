const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// 1. Set up the Cloudinary Storage Engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'community-connect/posts', // Automatically creates this folder in your Cloudinary dashboard
    allowed_formats: ['jpeg', 'jpg', 'png', 'webp', 'gif'], // Added 'gif' to align with frontend validation
    transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }], // Auto-compress and resize large images
  },
});

// 2. Strict File Filter (Security check alongside Cloudinary's format check)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only image files (JPEG, PNG, WEBP, GIF) are allowed.'),
      false
    );
  }
};

// 3. Initialize Multer Instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
});

module.exports = upload;