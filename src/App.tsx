
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Auth/Login';

// Private Route to enforce authentication
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

// Route for Login page that redirects to dashboard if already authenticated
const LoginRoute: React.FC = () => {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : <Login />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Authentication Routes */}
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          
          {/* Private Core Application Routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
