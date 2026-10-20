import { Request, Response, Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './openapi';

const router = Router();

// Raw OpenAPI 3.0 specification JSON endpoint
router.get('/json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(openapiSpec);
});

// Interactive Swagger UI
router.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: 'OrderFlow API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  })
);

export const swaggerRoutes = router;
