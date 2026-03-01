import axios from 'axios';

const api_url = import.meta.env.VITE_API_URL;

if (!api_url) {
  throw new Error('VITE_API_URL is not defined in environment variables. Please create a .env file in the web folder.');
}

const api = axios.create({
  baseURL: api_url,
});

// Add a request interceptor to add the JWT token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('flowforce_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('flowforce_token');
      localStorage.removeItem('flowforce_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
