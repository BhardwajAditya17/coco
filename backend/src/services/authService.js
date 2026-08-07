const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { ROLES, AADHAAR_STATUS } = require('../utils/constants');

const registerUser = async (data) => {
  const {
    name,
    email,
    password,
    role,
    bio,
    location,
    current_position,
    avatar_url,
  } = data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('Email is already in use.');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: role && Object.values(ROLES).includes(role) ? role : ROLES.USER,
      bio: bio || null,
      location: location || null,
      current_position: current_position || null,
      avatar_url: avatar_url || null,
      aadhaar_status: AADHAAR_STATUS?.NOT_STARTED || 'not_started',
      fee_status: 'unpaid',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar_url: true,
      current_position: true,
      location: true,
      bio: true,
      aadhaar_status: true,
      fee_status: true,
      created_at: true,
    },
  });

  return user;
};

const verifyCredentials = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials.');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid credentials.');
  }

  return user;
};

const getUserById = async (id) => {
  const userId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;

  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar_url: true,
      current_position: true,
      location: true,
      bio: true,
      aadhaar_status: true,
      fee_status: true,
      kyc_reference_id: true,
      created_at: true,
    },
  });
};

module.exports = {
  registerUser,
  verifyCredentials,
  getUserById,
};