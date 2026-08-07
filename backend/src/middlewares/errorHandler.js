const errorHandler = (err, req, res, next) => {
  // Log the error stack trace only in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error Trace:', err.stack);
  } else {
    console.error('Error:', err.message);
  }

  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Internal Server Error';

  // --- Prisma Specific Error Handling ---
  // Unique constraint violation (e.g., trying to use an already registered email)
  if (err.code === 'P2002') {
    statusCode = 409;
    message = `Duplicate field value entered. The ${err.meta?.target || 'field'} must be unique.`;
  }
  
  // Record not found
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Requested resource was not found in the database.';
  }

  // --- JWT Specific Error Handling ---
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please log in again.';
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    // Only send the stack trace in development mode for debugging
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;