import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { cartRoutes } from './cart.routes';
import { categoryRoutes } from './category.routes';
import { healthRoutes } from './health.routes';
import { orderRoutes } from './order.routes';
import { paymentRoutes } from './payment.routes';
import { productRoutes } from './product.routes';
import { swaggerRoutes } from '../docs/swagger.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/cart', cartRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/docs', swaggerRoutes);
