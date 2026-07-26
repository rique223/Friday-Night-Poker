import type { Request, Response } from 'express';
import type { LoginBody } from '@fnp/shared';

import { clearSession, issueSession } from '../middleware/auth.js';
import { validated } from '../middleware/validate.js';
import { verifyUser } from '../services/userService.js';

export async function login(req: Request, res: Response): Promise<void> {
    const { body } = validated<unknown, LoginBody, unknown>(req);

    const user = await verifyUser(body);
    if (!user) {
        res.status(401).json({
            success: false,
            error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
        });
        return;
    }

    issueSession(res, user);
    res.json({ success: true, data: { email: user.email, role: user.role } });
}

export function logout(_req: Request, res: Response): void {
    clearSession(res);
    res.json({ success: true });
}

export function me(req: Request, res: Response): void {
    res.json({ success: true, data: { email: req.user?.email, role: req.user?.role } });
}
