import jwt from 'jsonwebtoken';

const COOKIE = 'session';
const MAX_AGE_S = 60 * 60 * 24 * 2; // 2 days

export function issueSession(res, user) {
	const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
		algorithm: 'HS256',
		expiresIn: MAX_AGE_S,
	});

	res.cookie(COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: MAX_AGE_S * 1000,
		path: '/',
	});
}

export function clearSession(res) {
	res.clearCookie(COOKIE, { path: '/' });
}

export function requireAuth(req, res, next) {
	const token = req.cookies[COOKIE];
	if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });

	try {
		req.user = jwt.verify(token, process.env.JWT_SECRET);
		return next();
	} catch {
		return res.status(401).json({ success: false, error: 'Unauthorized' });
	}
}
