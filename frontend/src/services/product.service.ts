import { ApiClient } from '../lib/api';

export const ProductService = {
  getProducts: ApiClient.getProducts.bind(ApiClient),
  getProductById: ApiClient.getProductById.bind(ApiClient),
  getCategories: ApiClient.getCategories.bind(ApiClient),
};
