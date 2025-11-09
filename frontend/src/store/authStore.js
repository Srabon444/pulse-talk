import {create} from 'zustand';
import socketService from '../services/socket';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  // Initialize auth state from localStorage
  initialize: () => {
    const user = localStorage.getItem('pulse-talk-user');
    if (user) {
      const userData = JSON.parse(user);
      set({
        user: userData,
        isAuthenticated: true
      });

      // Connect to socket if user is authenticated and has token
      if (userData.token) {
        socketService.connect(userData.token);
      }
    }
  },

  // Login action
  login: (userData) => {
    localStorage.setItem('pulse-talk-user', JSON.stringify(userData));
    set({
      user: userData,
      isAuthenticated: true,
      isLoading: false
    });

    // Connect to socket after successful login
    if (userData.token) {
      socketService.connect(userData.token);
    }
  },

  // Logout action
  logout: () => {
    localStorage.removeItem('pulse-talk-user');
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });

    // Disconnect socket on logout
    socketService.disconnect();
  },

  // Set loading state
  setLoading: (loading) => {
    set({isLoading: loading});
  }
}));

export default useAuthStore;