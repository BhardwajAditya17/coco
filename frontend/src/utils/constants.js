/**
 * Application-wide configuration settings
 */
export const APP_CONFIG = {
  MAX_UPLOAD_SIZE_MB: 5,
  MAX_UPLOAD_SIZE_BYTES: 5 * 1024 * 1024,
  SUPPORTED_IMAGE_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
  POSTS_PER_PAGE: 10,
};

/**
 * User Role Definitions
 */
export const ROLES = {
  ADMIN: 'admin',
  NGO: 'ngo',
  USER: 'user', // standard social worker/volunteer
};

/**
 * Verification Statuses for Aadhaar / NGO Registration
 */
export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

/**
 * Standardized Feed Tags
 */
export const EVENT_TAGS = [
  'All', 
  '#BloodDonation', 
  '#Education', 
  '#FoodDrive', 
  '#DisasterRelief', 
  '#AnimalWelfare', 
  '#Environment', 
  '#HealthCamp'
];