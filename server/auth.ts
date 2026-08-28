import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../src/types';

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'replace_with_a_long_random_secret') {
    if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be configured in production.');
    return 'development-only-secret-change-before-deploying';
  }
  return secret;
}

export interface TokenPayload {
  userId: string;
  org_id: string;
  role: UserRole;
  email: string;
  name: string;
  student_profile_id?: string;
  batch_id?: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, jwtSecret(), { expiresIn: '8h' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, jwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized (HTTP 401)',
      message: 'Access token missing or invalid Bearer header.',
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      error: 'Unauthorized (HTTP 401)',
      message: 'Token expired or signature invalid.',
    });
  }

  req.user = payload;
  next();
}

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized (HTTP 401)',
        message: 'User authentication required.',
      });
    }

    const hasPermission = allowedRoles.includes(req.user.role) || (req.user.role === 'super_admin' && (allowedRoles.includes('admin') || allowedRoles.includes('faculty')));
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Forbidden (HTTP 403)',
        message: `Access denied. Role '${req.user.role}' is not authorized to access this resource. Required role(s): [${allowedRoles.join(', ')}].`,
      });
    }

    next();
  };
}

export function canAccessStudent(req: AuthenticatedRequest, studentUserId: string) {
  return req.user?.role === 'admin' || req.user?.role === 'super_admin' || req.user?.role === 'faculty' || req.user?.userId === studentUserId;
}
