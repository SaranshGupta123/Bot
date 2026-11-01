import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@rainfall/config';

export interface AuthenticatedUser {
  id: string;
  username: string;
  discriminator?: string;
  avatar?: string | null;
  guilds?: Array<{ id: string; name: string; permissions: string }>;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err: unknown) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired authentication token' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!config.DEVELOPER_USER_IDS.includes(req.user.id)) {
    res.status(403).json({ error: 'Forbidden: Super-admin privileges required' });
    return;
  }

  next();
}

