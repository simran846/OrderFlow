import { Prisma, Product } from '@prisma/client';
import { prisma } from '../../config/database';
import { CacheService } from '../../config/redis';
import { ConflictError, NotFoundError } from '../../errors/AppError';
import { CreateProductInput, QueryProductInput, UpdateProductInput } from './product.schema';

export interface PaginatedProducts {
  items: (Product & {
    category: { id: string; name: string; slug: string };
    inventory: { availableStock: number; reservedStock: number } | null;
  })[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class ProductService {
  private static readonly CACHE_PREFIX_SINGLE = 'product:id:';
  private static readonly CACHE_PATTERN_LIST = 'products:list:*';

  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  public static async createProduct(input: CreateProductInput) {
    // 1. Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const slug = input.slug || this.slugify(input.name);

    // 2. Check for slug collision
    const existingSlug = await prisma.product.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictError('A product with this slug already exists');
    }

    // 3. Atomically create product and initial inventory record
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          price: input.price,
          categoryId: input.categoryId,
          inventory: {
            create: {
              availableStock: input.stock,
              reservedStock: 0,
            },
          },
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          inventory: { select: { availableStock: true, reservedStock: true } },
        },
      });

      return created;
    });

    // 4. Invalidate all paginated list caches
    await CacheService.delByPattern(this.CACHE_PATTERN_LIST);

    return product;
  }

  public static async updateProduct(id: string, input: UpdateProductInput) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    if (input.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
      if (!category) {
        throw new NotFoundError('Target category not found');
      }
    }

    if (input.slug && input.slug !== existing.slug) {
      const slugConflict = await prisma.product.findUnique({ where: { slug: input.slug } });
      if (slugConflict) {
        throw new ConflictError('A product with this slug already exists');
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        price: input.price,
        categoryId: input.categoryId,
        isActive: input.isActive,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        inventory: { select: { availableStock: true, reservedStock: true } },
      },
    });

    // Invalidate single product cache and all list caches
    await CacheService.del(`${this.CACHE_PREFIX_SINGLE}${id}`);
    await CacheService.delByPattern(this.CACHE_PATTERN_LIST);

    return updated;
  }

  public static async deleteProduct(id: string): Promise<void> {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    // Soft deactivation to preserve historical order integrity
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    await CacheService.del(`${this.CACHE_PREFIX_SINGLE}${id}`);
    await CacheService.delByPattern(this.CACHE_PATTERN_LIST);
  }

  public static async getProductById(id: string) {
    const cacheKey = `${this.CACHE_PREFIX_SINGLE}${id}`;
    const cached = await CacheService.get<Product>(cacheKey);
    if (cached) {
      return cached;
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        inventory: { select: { availableStock: true, reservedStock: true } },
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    await CacheService.set(cacheKey, product, 1800); // 30 minutes TTL
    return product;
  }

  public static async listProducts(query: QueryProductInput): Promise<PaginatedProducts> {
    const cacheKey = `products:list:${JSON.stringify(query)}`;
    const cached = await CacheService.get<PaginatedProducts>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...((query.minPrice !== undefined || query.maxPrice !== undefined) && {
        price: {
          ...(query.minPrice !== undefined && { gte: query.minPrice }),
          ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
        },
      }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search } },
          { description: { contains: query.search } },
        ],
      }),
    };

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [totalItems, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          inventory: { select: { availableStock: true, reservedStock: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    const result: PaginatedProducts = {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    await CacheService.set(cacheKey, result, 300); // 5 minutes TTL
    return result;
  }
}
