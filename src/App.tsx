import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import Dashboard from '@/features/dashboard/DashboardPage';
import Login from '@/features/auth/Login';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import SystemLoader from '@/components/common/SystemLoader';
import UpdateWatcher from '@/components/common/UpdateWatcher';

// Private Route to enforce authentication with smooth session loading
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <SystemLoader message="Iniciando sessão..." submessage="Verificando autenticação segura" />;
  }
  
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

// Route for Login page that redirects to dashboard if already authenticated
const LoginRoute: React.FC = () => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <SystemLoader message="Verificando credenciais..." />;
  }
  
  return user ? <Navigate to="/dashboard" replace /> : <Login />;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
          <UpdateWatcher />
          <Routes>
            {/* Authentication Routes */}
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            
            {/* Private Core Application Routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {/* Uma única rota para todas as abas (/agenda, /financeiro...): navegar entre elas não remonta o app */}
            <Route
              path="*"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
          </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
