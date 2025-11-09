import axios from 'axios';

// In development, use proxy. In production, use environment variable
const API_BASE_URL = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api');

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookie-based auth
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest' // Simple CSRF protection header
  }
});

// Auth API functions
export const authAPI = {
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  }
};

// Comments API functions
export const commentsAPI = {
  async getComments({ page = 1, limit = 10, sortBy = 'newest', depth = 3 } = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      depth: depth.toString()
    });
    
    const response = await api.get(`/comments?${params}`);
    return response.data;
  },

  async getComment(commentId) {
    const response = await api.get(`/comments/${commentId}`);
    return response.data;
  },

  async createComment(commentData) {
    const response = await api.post('/comments', commentData);
    return response.data;
  },

  async updateComment(commentId, commentData) {
    const response = await api.put(`/comments/${commentId}`, commentData);
    return response.data;
  },

  async deleteComment(commentId) {
    const response = await api.delete(`/comments/${commentId}`);
    return response.data;
  },

  async replyToComment(parentId, content) {
    const response = await api.post(`/comments/${parentId}/reply`, { content });
    return response.data;
  },

  async likeComment(commentId) {
    const response = await api.post(`/comments/${commentId}/like`);
    return response.data;
  },

  async dislikeComment(commentId) {
    const response = await api.post(`/comments/${commentId}/dislike`);
    return response.data;
  }
};

export default api;