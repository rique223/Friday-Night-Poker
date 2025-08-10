import { clearSession, issueSession } from '../middleware/auth.js';
import { verifyUser } from '../services/userService.js';

export async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ success: false, error: 'Email and password are required' });

    const user = await verifyUser({ email, password });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    issueSession(res, user);
    res.json({ success: true, data: { email: user.email, role: user.role } });
}

export async function logout(_, res) {
    clearSession(res);
    res.json({ success: true });
}

export async function me(req, res) {
    const { email, role } = req.user;
    res.json({ success: true, data: { email, role } });
}
