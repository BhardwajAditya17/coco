const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// 1. Configure Cloudinary with your credentials (get these from your Cloudinary dashboard)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Set up the storage engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'community_connect_posts', // Folder name in Cloudinary
    allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

// 3. Create the multer upload middleware
const upload = multer({ storage: storage });

module.exports = { upload, cloudinary };