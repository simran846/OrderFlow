import bcrypt from 'bcryptjs';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { UnauthorizedError } from '../errors/AppError';

export interface AuthTokenPayload extends JwtPayload {
  userId: string;
  role: Role;
  email: string;
}

export class SecurityUtils {
  private static readonly SALT_ROUNDS = 10;

  public static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static generateAccessToken(payload: {
    userId: string;
    role: Role;
    email: string;
  }): string {
    const options: SignOptions = {
      expiresIn: env.JWT_ACCESS_EXPIRATION as unknown as number, // String like '15m' supported by jsonwebtoken
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
  }

  public static verifyAccessToken(token: string): AuthTokenPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthTokenPayload;
      return decoded;
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }
}
