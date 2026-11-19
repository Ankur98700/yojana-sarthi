import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { CitizenProfile, UserAccount } from '../src/types.ts';
import { getDb } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'yojana-sarthi-local-dev-jwt-secret-key-2026';
export const AUTH_COOKIE_NAME = 'yojana_sarthi_token';

interface JwtPayload {
  userId: number;
  email: string;
  role: 'citizen' | 'admin';
}

export interface AuthenticatedRequest extends Request {
  user?: UserAccount;
}

export function signAuthToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: 'citizen' | 'admin';
  profile_json: string;
  created_at: string;
}

export function mapUserRow(row: UserRow): UserAccount {
  let profile: CitizenProfile = {};
  try {
    profile = JSON.parse(row.profile_json || '{}') as CitizenProfile;
  } catch {
    profile = {};
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    profile,
    createdAt: row.created_at,
  };
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.trim()) {
    return cookieToken.trim();
  }
  return null;
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const db = getDb();
    const row = db
      .prepare('SELECT id, name, email, role, profile_json, created_at FROM users WHERE id = ?')
      .get(decoded.userId) as UserRow | undefined;
    if (row) {
      req.user = mapUserRow(row);
    }
  } catch {
    // Invalid or expired token -> treat as guest on optional routes
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in to continue.' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const db = getDb();
    const row = db
      .prepare('SELECT id, name, email, role, profile_json, created_at FROM users WHERE id = ?')
      .get(decoded.userId) as UserRow | undefined;
    if (!row) {
      res.status(401).json({ error: 'User session is no longer valid. Please log in again.' });
      return;
    }
    req.user = mapUserRow(row);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Administrator privileges are required to perform this action.' });
      return;
    }
    next();
  });
}
