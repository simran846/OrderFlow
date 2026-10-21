'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CartSummary, ProductSummary } from '@/types';
import { ApiClient } from '../lib/api';

interface CartContextType {
  cart: CartSummary;
  itemCount: number;
  isLoading: boolean;
  addToCart: (product: ProductSummary, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const defaultCart: CartSummary = {
  id: 'guest',
  items: [],
  totalAmount: '0.00',
  itemCount: 0,
};

const CartContext = createContext<CartContextType>({
  cart: defaultCart,
  itemCount: 0,
  isLoading: false,
  addToCart: async () => {},
  updateQuantity: async () => {},
  removeItem: async () => {},
  clearCart: async () => {},
  refreshCart: async () => {},
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartSummary>(defaultCart);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    try {
      const data = await ApiClient.getCart();
      setCart(data);
    } catch (err) {
      console.warn('Failed to refresh cart:', err);
    }
  }, []);

  useEffect(() => {
    refreshCart();

    const handleCartUpdated = () => refreshCart();
    window.addEventListener('cart:updated', handleCartUpdated);
    window.addEventListener('auth:login', handleCartUpdated);

    return () => {
      window.removeEventListener('cart:updated', handleCartUpdated);
      window.removeEventListener('auth:login', handleCartUpdated);
    };
  }, [refreshCart]);

  const addToCart = async (product: ProductSummary, quantity = 1) => {
    setIsLoading(true);
    try {
      const updated = await ApiClient.addToCart(product, quantity);
      setCart(updated);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    setIsLoading(true);
    try {
      const updated = await ApiClient.updateCartItem(productId, quantity);
      setCart(updated);
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (productId: string) => {
    setIsLoading(true);
    try {
      const updated = await ApiClient.removeFromCart(productId);
      setCart(updated);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    setIsLoading(true);
    try {
      await ApiClient.clearCart();
      setCart(defaultCart);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount: cart.itemCount,
        isLoading,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
