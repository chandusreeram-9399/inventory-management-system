import apiClient from './client'

export const ordersApi = {
  list: () => apiClient.get('/orders/').then((r) => r.data),
  get: (id) => apiClient.get(`/orders/${id}`).then((r) => r.data),
  create: (payload) => apiClient.post('/orders/', payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/orders/${id}`).then((r) => r.data),
}
