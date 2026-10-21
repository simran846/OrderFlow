export * from './order.types';

export type Role = 'CUSTOMER' | 'ADMIN';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

export type PaymentProvider = 'STRIPE' | 'MOCK';

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt: string | Date;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface ProductInventorySummary {
  availableStock: number;
  reservedStock?: number;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number | string;
  isActive?: boolean;
  categoryId: string;
  category?: CategorySummary;
  inventory?: ProductInventorySummary;
  createdAt?: string | Date;
}

export interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  country?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
