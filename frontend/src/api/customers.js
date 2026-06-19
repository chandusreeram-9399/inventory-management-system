import apiClient from './client'

export const customersApi = {
  list: () => apiClient.get('/customers/').then((r) => r.data),
  get: (id) => apiClient.get(`/customers/${id}`).then((r) => r.data),
  create: (payload) => apiClient.post('/customers/', payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/customers/${id}`).then((r) => r.data),
}
