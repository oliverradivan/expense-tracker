import { VITE_API_URL } from '../utils/constants';

// Base API client with credentials (for cookies)
export const api = {
  get: async (endpoint, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = `${VITE_API_URL}${endpoint}${query ? `?${query}` : ''}`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    return response;
  },
  post: async (endpoint, data) => {
    const url = `${VITE_API_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response;
  },
  postForm: async (endpoint, formData) => {
    const url = `${VITE_API_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(formData),
    });
    return response;
  },
  put: async (endpoint, data) => {
    const url = `${VITE_API_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response;
  },
  delete: async (endpoint) => {
    const url = `${VITE_API_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
    });
    return response;
  },
  deleteForm: async (endpoint, formData) => {
    const url = `${VITE_API_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(formData),
    });
    return response;
  },
};