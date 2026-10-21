/**
 * OrderFlow Frontend Domain Types & API Contracts
 */

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
  createdAt: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  productCount?: number;
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
  createdAt?: string;
  image?: string;
}

export interface CartItemSummary {
  id: string;
  productId: string;
  quantity: number;
  product?: ProductSummary;
  subtotal?: string | number;
}

export interface CartSummary {
  id: string;
  items: CartItemSummary[];
  totalAmount: string | number;
  itemCount: number;
}

export interface OrderItemSummary {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number | string;
  quantity: number;
  subtotal: number | string;
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

export interface OrderSummary {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number | string;
  shippingAddress: string | ShippingAddress;
  createdAt: string;
  updatedAt?: string;
  items?: OrderItemSummary[];
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
