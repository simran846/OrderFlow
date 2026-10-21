import { ApiClient } from '../lib/api';

export const OrderService = {
  checkout: ApiClient.checkout.bind(ApiClient),
  getOrders: ApiClient.getOrders.bind(ApiClient),
  getOrderById: ApiClient.getOrderById.bind(ApiClient),
  cancelOrder: ApiClient.cancelOrder.bind(ApiClient),
  createPaymentIntent: ApiClient.createPaymentIntent.bind(ApiClient),
};
