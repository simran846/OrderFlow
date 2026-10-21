import { ApiClient } from '../lib/api';

export const AuthService = {
  login: ApiClient.login.bind(ApiClient),
  register: ApiClient.register.bind(ApiClient),
  logout: ApiClient.logout.bind(ApiClient),
  getMe: ApiClient.getMe.bind(ApiClient),
  isAuthenticated: ApiClient.isAuthenticated.bind(ApiClient),
  getCurrentUser: ApiClient.getCurrentUser.bind(ApiClient),
};
