import {create} from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  // Initialize auth state from localStorage
  initialize: () => {
    const user = localStorage.getItem('pulse-talk-user');
    if (user) {
      set({
        user: JSON.parse(user),
        isAuthenticated: true
      });
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
  },

  // Logout action
  logout: () => {
    localStorage.removeItem('pulse-talk-user');
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
  },

  // Set loading state
  setLoading: (loading) => {
    set({isLoading: loading});
  }
}));

export default useAuthStore;