import { Role, User } from '@prisma/client';
import { prisma } from '../../config/database';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../errors/AppError';
import { SecurityUtils } from '../../utils/security';
import { LoginInput, RegisterInput } from './auth.schema';

export interface SanitizedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt: Date;
}

export interface AuthResponse {
  user: SanitizedUser;
  accessToken: string;
}

export class AuthService {
  private static sanitizeUser(user: User): SanitizedUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  public static async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await SecurityUtils.hashPassword(input.password);

    // Atomically create user and initialize their shopping cart
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: Role.CUSTOMER,
        cart: {
          create: {},
        },
      },
    });

    const accessToken = SecurityUtils.generateAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
    };
  }

  public static async login(input: LoginInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    // Timing-safe generic error message to prevent username enumeration attacks
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await SecurityUtils.comparePassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const accessToken = SecurityUtils.generateAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
    };
  }

  public static async getCurrentUser(userId: string): Promise<SanitizedUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return this.sanitizeUser(user);
  }
}
