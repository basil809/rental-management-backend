const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message || 'Something went wrong',
    stack: process.env.NODE_ENV === 'production' ? '🍔' : err.stack,
  });
};

module.exports = errorHandler;
// c:\Users\basch\OneDrive\Desktop\Rental management system\rental-management-backend\middleware\errorHandler.js