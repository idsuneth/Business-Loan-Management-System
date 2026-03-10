import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Login from './components/auth/Login';
import AdminPage from './pages/AdminPage';
import OfficerPage from './pages/OfficerPage';
import './styles/glassy.css';

function App() {
  const isAuthenticated = () => {
    return localStorage.getItem('authToken') !== null;
  };

  const getUserRole = () => {
    return localStorage.getItem('userRole');
  };

  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/login" replace />;
    }
    
    const role = getUserRole();
    if (allowedRoles && !allowedRoles.includes(role)) {
      return <Navigate to="/login" replace />;
    }
    
    return children;
  };

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/officer/*"
            element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <OfficerPage />
              </ProtectedRoute>
            }
          />
          
          {/* Default redirect based on role or to login */}
          <Route
            path="/"
            element={
              isAuthenticated() ? (
                getUserRole() === 'admin' ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/officer" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          
          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
