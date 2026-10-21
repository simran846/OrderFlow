import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';
import { SecurityUtils } from '../utils/security';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError(
      'Authentication token missing or invalid format (Bearer token required)'
    );
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError('Bearer token is empty');
  }

  const payload = SecurityUtils.verifyAccessToken(token);

  req.user = {
    id: payload.userId,
    email: payload.email,
    role: payload.role,
  };

  next();
};

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('User authentication required before role authorization');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Role [${req.user.role}] lacks permission. Required roles: [${allowedRoles.join(', ')}]`
      );
    }

    next();
  };
};
