import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('smartloan-theme');
    return saved || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('smartloan-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Apply theme to body
    if (theme === 'light') {
      document.body.style.background = '#f1f5f9';
    } else {
      document.body.style.background = '#0f172a';
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';

  // Theme colors object
  const colors = {
    // Backgrounds
    bg: isDark ? '#1e293b' : '#ffffff',
    bgHover: isDark ? '#334155' : '#f8fafc',
    bgCard: isDark ? '#1e293b' : '#ffffff',
    bgInput: isDark ? '#0f172a' : '#f8fafc',
    bgModal: isDark ? '#1e293b' : '#ffffff',
    bgPage: isDark ? '#0f172a' : '#f1f5f9',
    
    // Borders
    border: isDark ? '#334155' : '#e2e8f0',
    borderLight: isDark ? '#1e293b' : '#f1f5f9',
    borderActive: isDark ? '#4361ee' : '#4361ee',
    
    // Text
    text: isDark ? '#f1f5f9' : '#1e293b',
    textSecondary: isDark ? '#cbd5e1' : '#475569',
    textMuted: isDark ? '#94a3b8' : '#94a3b8',
    textLight: isDark ? '#64748b' : '#cbd5e1',
    
    // Primary colors
    primary: '#4361ee',
    primaryHover: '#3f37c9',
    primaryBg: isDark ? 'rgba(67, 97, 238, 0.15)' : '#eef2ff',
    
    // Status colors
    success: '#10b981',
    successBg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
    warning: '#f59e0b',
    warningBg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
    danger: '#ef4444',
    dangerBg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
    info: '#3b82f6',
    infoBg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
    
    // Shadows
    shadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
    shadowLight: isDark ? '0 1px 2px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.05)'
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
