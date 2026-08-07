const authService = require('../services/authService');
const { generateToken } = require('../utils/jwt');

/**
 * Helper to safely format file paths.
 * Returns web-relative path (/uploads/filename) for local uploads,
 * or the original remote URL if stored on Cloudinary/S3.
 */
const getFileUrl = (file) => {
  if (!file) return null;
  if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
    return file.path;
  }
  return `/uploads/${file.filename}`;
};

const register = async (req, res, next) => {
  try {
    const avatarFile = req.files?.avatar?.[0];
    const avatar_url = getFileUrl(avatarFile);

    const registrationData = {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
      bio: req.body.bio,
      location: req.body.location,
      current_position: req.body.current_position,
      avatar_url,
    };

    const user = await authService.registerUser(registrationData);
    const token = generateToken(user.id, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please complete identity verification.',
      token,
      data: user,
    });
  } catch (error) {
    if (error.message === 'Email is already in use.') {
      return res.status(409).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await authService.verifyCredentials(email, password);
    const token = generateToken(user.id, user.role);

    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      data: userWithoutPassword,
    });
  } catch (error) {
    if (error.message === 'Invalid credentials.') {
      return res.status(401).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
};