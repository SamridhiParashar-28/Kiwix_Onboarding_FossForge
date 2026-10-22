/**
 * Kiwix Onboarding - Authentication & Session Management
 * Client-side authentication using localStorage (Zero-backend required)
 */

(function () {
  'use strict';

  const AUTH_STORAGE_KEYS = {
    USERS: 'kiwix_users',
    CURRENT_USER: 'kiwix_current_user',
    THEME: 'kiwix_theme'
  };

  // Pre-seed demo user if none exists
  function seedDefaultUsers() {
    try {
      const existing = localStorage.getItem(AUTH_STORAGE_KEYS.USERS);
      if (!existing) {
        const defaultUsers = [
          {
            id: 'user-demo-1',
            name: 'Kiwix Explorer',
            email: 'demo@kiwix.org',
            password: 'password123',
            createdAt: new Date().toISOString()
          }
        ];
        localStorage.setItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
      }
    } catch (e) {
      console.warn('LocalStorage error while seeding users:', e);
    }
  }

  // Get all registered users
  function getAllUsers() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USERS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  // Get currently logged-in user
  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Register a new user
  function signUpUser(name, email, password) {
    seedDefaultUsers();
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanName) {
      return { success: false, error: 'Please enter your full name.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const users = getAllUsers();
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, error: 'An account with this email already exists. Please Sign In.' };
    }

    const newUser = {
      id: `user-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      password: password,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    try {
      localStorage.setItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify(users));
      localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
      return { success: true, user: newUser };
    } catch (e) {
      return { success: false, error: 'Failed to save account to localStorage.' };
    }
  }

  // Sign In an existing user
  function signInUser(email, password) {
    seedDefaultUsers();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      return { success: false, error: 'Please enter both your email and password.' };
    }

    const users = getAllUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);

    if (!user) {
      return { success: false, error: 'Invalid email or password. Please verify your credentials.' };
    }

    try {
      localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return { success: true, user: user };
    } catch (e) {
      return { success: false, error: 'Failed to establish session in localStorage.' };
    }
  }

  // Log Out current user
  function logoutUser() {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER);
    } catch (e) {
      console.warn('Logout error:', e);
    }
    window.location.href = 'index.html';
  }

  // Auth Guard: If on protected page (onboarding.html) and not logged in, redirect to signin.html
  function requireAuth() {
    seedDefaultUsers();
    const user = getCurrentUser();
    if (!user) {
      window.location.href = 'signin.html';
      return null;
    }
    return user;
  }

  // Guest Guard: If on public page (index.html, signin.html, signup.html) and ALREADY logged in, redirect to onboarding.html
  function redirectIfAuthenticated() {
    seedDefaultUsers();
    const user = getCurrentUser();
    if (user) {
      window.location.href = 'onboarding.html';
    }
  }

  function toggleTheme() {
    const currentTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem(AUTH_STORAGE_KEYS.THEME, nextTheme);
    return nextTheme;
  }

  // Universal Theme Controller for all pages
  function setupGlobalTheme() {
    const savedTheme = localStorage.getItem(AUTH_STORAGE_KEYS.THEME) || 'dark';
    applyTheme(savedTheme);

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn && !themeToggleBtn.dataset.themeBound) {
      themeToggleBtn.dataset.themeBound = 'true';
      themeToggleBtn.addEventListener('click', () => {
        toggleTheme();
      });
    }
  }

  function applyTheme(theme) {
    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');

    if (theme === 'light') {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      if (iconSun) iconSun.classList.add('hidden');
      if (iconMoon) iconMoon.classList.remove('hidden');
    } else {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      if (iconMoon) iconMoon.classList.add('hidden');
      if (iconSun) iconSun.classList.remove('hidden');
    }
    localStorage.setItem(AUTH_STORAGE_KEYS.THEME, theme);
  }

  // Auto-init theme
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      seedDefaultUsers();
      setupGlobalTheme();
    });
  } else {
    seedDefaultUsers();
    setupGlobalTheme();
  }

  // Export to window
  window.KiwixAuth = {
    getCurrentUser,
    getAllUsers,
    signUpUser,
    signInUser,
    logoutUser,
    requireAuth,
    redirectIfAuthenticated,
    setupGlobalTheme,
    applyTheme,
    toggleTheme
  };

})();
