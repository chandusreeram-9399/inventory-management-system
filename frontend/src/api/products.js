import apiClient from './client'

export const productsApi = {
  list: () => apiClient.get('/products/').then((r) => r.data),
  get: (id) => apiClient.get(`/products/${id}`).then((r) => r.data),
  create: (payload) => apiClient.post('/products/', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/products/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/products/${id}`).then((r) => r.data),
}
