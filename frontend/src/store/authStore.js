import { create } from 'zustand';
import { authApi, userApi } from '../lib/api';

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true, // true until initial auth check completes
  isVerified: false,
  onboardingComplete: false,
  error: null,

  // Check current session on app load
  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.me();
      const { user, profile, onboardingComplete } = res.data;
      set({
        user,
        profile,
        isAuthenticated: true,
        isVerified: user.emailVerified,
        onboardingComplete: onboardingComplete || false,
        isLoading: false,
      });
    } catch {
      set({
        user: null,
        profile: null,
        isAuthenticated: false,
        isVerified: false,
        onboardingComplete: false,
        isLoading: false,
      });
    }
  },

  // Login
  login: async (credentials) => {
    set({ error: null });
    const res = await authApi.login(credentials);
    const { user, profile, onboardingComplete, token } = res.data;
    if (token) {
      try { localStorage.setItem('sankshep_token', token); } catch (e) {}
    }
    set({
      user,
      profile,
      isAuthenticated: true,
      isVerified: user.emailVerified,
      onboardingComplete: onboardingComplete || false,
    });
    return res.data;
  },

  // Signup
  signup: async (data) => {
    set({ error: null });
    const res = await authApi.signup(data);
    // After signup user is not yet logged in — they must verify email first
    return res.data;
  },

  // Logout
  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      try { localStorage.removeItem('sankshep_token'); } catch (e) {}
      set({
        user: null,
        profile: null,
        isAuthenticated: false,
        isVerified: false,
        onboardingComplete: false,
      });
    }
  },

  // Update user after verification
  setEmailVerified: (data) => {
    if (data?.token) {
      try { localStorage.setItem('sankshep_token', data.token); } catch (e) {}
    }
    if (data?.user) {
      set({
        user: data.user,
        profile: data.profile || null,
        isAuthenticated: true,
        isVerified: true,
        onboardingComplete: data.onboardingComplete || false,
      });
    } else {
      set((state) => ({
        user: state.user ? { ...state.user, emailVerified: true } : state.user,
        isAuthenticated: true,
        isVerified: true,
      }));
    }
  },

  // Update profile
  updateProfile: (profileData) => {
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...profileData } : profileData,
    }));
  },

  // Mark onboarding complete
  completeOnboarding: () => {
    set({ onboardingComplete: true });
  },

  // Set user from OAuth callback
  setUser: (user, profile, onboardingComplete) => {
    set({
      user,
      profile,
      isAuthenticated: true,
      isVerified: user.emailVerified,
      onboardingComplete: onboardingComplete || false,
    });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
