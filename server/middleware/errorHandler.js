export function errorHandler(err, _req, res, _next) {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    const details = err.details || undefined;
    if (status >= 500) {
        console.error(err);
    }
    res.status(status).json({ success: false, error: message, details });
}

export function notFoundHandler(_req, res) {
    res.status(404).json({ success: false, error: 'Not Found' });
}

export function wrapAsync(fn) {
    return function wrapped(req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
