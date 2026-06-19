import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

// Normalize FastAPI's error payloads (which use either `detail` as a
// string, or `{detail, errors}` for validation failures) into a single
// readable message so every screen can display errors the same way.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data
    let message = 'Something went wrong. Please try again.'

    if (typeof data?.detail === 'string') {
      message = data.detail
    } else if (Array.isArray(data?.errors) && data.errors.length > 0) {
      message = data.errors.map((e) => `${e.field}: ${e.message}`).join(' / ')
    } else if (!error.response) {
      message = 'Could not reach the server. Check your connection and try again.'
    }

    return Promise.reject(new Error(message))
  }
)

export default apiClient
