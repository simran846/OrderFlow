import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authRateLimiter } from '../../middlewares/rateLimiter';
import { validateRequest } from '../../middlewares/validate.middleware';
import { AuthController } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: registerSchema }),
  AuthController.register
);
router.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  AuthController.login
);
router.get('/me', authenticate, AuthController.me);

export const authRoutes = router;
