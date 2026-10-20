import { Category } from '@prisma/client';
import { prisma } from '../../config/database';
import { CacheService } from '../../config/redis';
import { ConflictError } from '../../errors/AppError';
import { CreateCategoryInput } from './category.schema';

export class CategoryService {
  private static readonly CACHE_KEY_ALL = 'categories:all';

  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  public static async createCategory(input: CreateCategoryInput): Promise<Category> {
    const slug = input.slug || this.slugify(input.name);

    const existing = await prisma.category.findFirst({
      where: {
        OR: [{ name: input.name }, { slug }],
      },
    });

    if (existing) {
      throw new ConflictError('A category with this name or slug already exists');
    }

    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
      },
    });

    // Invalidate categories cache
    await CacheService.del(this.CACHE_KEY_ALL);

    return category;
  }

  public static async listCategories(): Promise<Category[]> {
    const cached = await CacheService.get<Category[]>(this.CACHE_KEY_ALL);
    if (cached) {
      return cached;
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    await CacheService.set(this.CACHE_KEY_ALL, categories, 3600); // 1 hour TTL
    return categories;
  }
}
