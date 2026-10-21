import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for OrderFlow...');

  // 1. Clean existing data in reverse relational order
  await prisma.idempotencyRecord.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Users
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin123!', salt);
  const customerPasswordHash = await bcrypt.hash('Customer123!', salt);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@orderflow.dev',
      passwordHash: adminPasswordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: Role.ADMIN,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: 'customer@orderflow.dev',
      passwordHash: customerPasswordHash,
      firstName: 'John',
      lastName: 'Doe',
      role: Role.CUSTOMER,
      cart: {
        create: {}, // Initialize empty shopping cart for customer
      },
    },
  });

  console.log(` Created users: Admin (${admin.email}), Customer (${customer.email})`);

  // 3. Seed Categories
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

  console.log(' Created categories: Electronics, Footwear, Accessories');

  // 4. Seed Products with Inventory
  const productsData = [
    {
      name: 'Wireless Noise-Canceling Headphones',
      slug: 'wireless-noise-canceling-headphones',
      description: 'Premium active noise-canceling headphones with 40-hour battery life and high-fidelity sound.',
      price: 199.99,
      categoryId: electronics.id,
      stock: 50,
    },
    {
      name: 'Mechanical Gaming Keyboard',
      slug: 'mechanical-gaming-keyboard',
      description: 'RGB mechanical keyboard with hot-swappable tactile switches and aluminum chassis.',
      price: 129.50,
      categoryId: electronics.id,
      stock: 25,
    },
    {
      name: 'Ultra-Light Running Shoes',
      slug: 'ultra-light-running-shoes',
      description: 'Breathable, lightweight running shoes engineered for high shock absorption and marathon durability.',
      price: 89.00,
      categoryId: footwear.id,
      stock: 15,
    },
    {
      name: 'Limited Edition Smart Watch',
      slug: 'limited-edition-smart-watch',
      description: 'Ultra-rare collector smartwatch with titanium bezel. Only 1 unit in stock for concurrency testing.',
      price: 499.00,
      categoryId: accessories.id,
      stock: 1, // Crucial for testing concurrency race conditions in Milestone 6!
    },
  ];

  for (const item of productsData) {
    const product = await prisma.product.create({
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
    console.log(` Created product: "${product.name}" with ${item.stock} in stock`);
  }

  console.log('✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
