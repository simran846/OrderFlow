import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validate.middleware';
import { AuthController } from '../controllers/auth.controller';
import { loginSchema, registerSchema } from '../validators/auth.schema';

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
