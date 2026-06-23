export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Centralised error handler. Maps common Mongoose errors to sensible
// HTTP status codes and always returns JSON of the shape { message }.
export function errorHandler(err, req, res, _next) {
  console.error(err);

  let status = err.status || 500;
  let message = err.message || 'Server error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join('; ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for "${err.path}"`;
  } else if (err.code === 11000) {
    status = 409;
    message = `Duplicate value: ${Object.keys(err.keyValue || {}).join(', ')}`;
  }

  // Never leak internal error details to clients on unexpected server faults
  // (the full error is already logged above for server-side debugging).
  if (status >= 500) message = 'Server error';

  res.status(status).json({ message });
}
