import { exec } from 'child_process';
import { promisify } from 'util';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from './database';
import { env } from './env';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export const initializeDatabase = async (): Promise<void> => {
  if (env.NODE_ENV === 'production' && env.DATABASE_URL.includes('localhost')) {
    logger.warn(
      '⚠️ [Database Notice] Remote DATABASE_URL not configured. MySQL database operations will be unavailable.'
    );
    return;
  }

  try {
    await prisma.$connect();
    logger.info(' Connected to MySQL database via Prisma');

    let tablesExist = false;
    try {
      await prisma.category.count();
      tablesExist = true;
    } catch {
      logger.info('ℹ️ Database tables not found. Automatically synchronizing Prisma schema...');
    }

    if (!tablesExist) {
      try {
        await execAsync('npx prisma db push --skip-generate --accept-data-loss');
        logger.info('✅ Prisma schema synchronized successfully (MySQL tables created)');
      } catch (pushErr: any) {
        logger.warn({ err: pushErr.message }, '⚠️ prisma db push encountered an issue');
      }
    }

    try {
      const categoryCount = await prisma.category.count();
      if (categoryCount === 0) {
        logger.info('🌱 Database is empty. Seeding initial catalog data...');
        await seedCatalog();
        logger.info('✅ Initial catalog seeded successfully');
      }
    } catch (seedErr: any) {
      logger.warn({ err: seedErr.message }, '⚠️ Auto-seeding skipped');
    }
  } catch (error: any) {
    logger.warn(
      { err: error.message },
      '⚠️ Could not establish connection to MySQL database. Server running with DB fallback.'
    );
  }
};

async function seedCatalog(): Promise<void> {
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin123!', salt);
  const customerPasswordHash = await bcrypt.hash('Customer123!', salt);

  await prisma.user.create({
    data: {
      email: 'admin@orderflow.dev',
      passwordHash: adminPasswordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: Role.ADMIN,
    },
  });

  await prisma.user.create({
    data: {
      email: 'customer@orderflow.dev',
      passwordHash: customerPasswordHash,
      firstName: 'John',
      lastName: 'Doe',
      role: Role.CUSTOMER,
      cart: { create: {} },
    },
  });

  const electronics = await prisma.category.create({
    data: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Audio, computing, and electronic smart devices',
    },
  });

  const footwear = await prisma.category.create({
    data: {
      name: 'Footwear',
      slug: 'footwear',
      description: 'Performance athletic shoes and casual sneakers',
    },
  });

  const accessories = await prisma.category.create({
    data: {
      name: 'Accessories',
      slug: 'accessories',
      description: 'Everyday carry, backpacks, and tech essentials',
    },
  });

  const productsData = [
    {
      name: 'Wireless Noise-Canceling Headphones',
      slug: 'wireless-noise-canceling-headphones',
      description:
        'Premium active noise-canceling headphones with 40-hour battery life and high-fidelity sound.',
      price: 199.99,
      categoryId: electronics.id,
      stock: 50,
    },
    {
      name: 'Mechanical Gaming Keyboard',
      slug: 'mechanical-gaming-keyboard',
      description:
        'RGB mechanical keyboard with hot-swappable tactile switches and aluminum chassis.',
      price: 129.5,
      categoryId: electronics.id,
      stock: 25,
    },
    {
      name: 'Ultra-Light Running Shoes',
      slug: 'ultra-light-running-shoes',
      description:
        'Breathable, lightweight running shoes engineered for high shock absorption and marathon durability.',
      price: 89.0,
      categoryId: footwear.id,
      stock: 15,
    },
    {
      name: 'Limited Edition Smart Watch',
      slug: 'limited-edition-smart-watch',
      description:
        'Ultra-rare collector smartwatch with titanium bezel. Only 1 unit in stock for concurrency testing.',
      price: 499.0,
      categoryId: accessories.id,
      stock: 1,
    },
  ];

  for (const item of productsData) {
    await prisma.product.create({
      data: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        price: item.price,
        categoryId: item.categoryId,
        inventory: {
          create: {
            availableStock: item.stock,
            reservedStock: 0,
          },
        },
      },
    });
  }
}
