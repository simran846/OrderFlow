import { ApiClient } from '../lib/api';

export const CartService = {
  getCart: ApiClient.getCart.bind(ApiClient),
  addToCart: ApiClient.addToCart.bind(ApiClient),
  updateCartItem: ApiClient.updateCartItem.bind(ApiClient),
  removeFromCart: ApiClient.removeFromCart.bind(ApiClient),
  clearCart: ApiClient.clearCart.bind(ApiClient),
};
