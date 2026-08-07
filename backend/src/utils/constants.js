const ROLES = {
  USER: 'user',
  NGO: 'ngo',
  ADMIN: 'admin',
};

const AADHAAR_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

module.exports = {
  ROLES,
  AADHAAR_STATUS,
  HTTP_STATUS,
};