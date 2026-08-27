import axios from 'axios';

const apiResponsable = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

apiResponsable.interceptors.request.use((config) => {
  const token = localStorage.getItem('tokenResponsable');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiResponsable;