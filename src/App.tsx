import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminProvider, useAdmin } from './contexts/AdminContext';
import { PartnerProvider, usePartner } from './contexts/PartnerContext';
import { Index } from './pages/Index';
import Login from './components/Auth/Login';
import Recovery from './components/Auth/Recovery';
import Dashboard from './components/Dashboard/Dashboard';
import AdminLogin from './components/Admin/AdminLogin';
import Operaciones from './components/Admin/Operaciones';
import SocioDashboard from './components/Socio/SocioDashboard';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { admin, loading } = useAdmin();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return admin ? <>{children}</> : <Navigate to="/admin-login" replace />;
};

const PartnerProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { partner, loading } = usePartner();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return partner ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: userLoading } = useAuth();
  const { partner, loading: partnerLoading } = usePartner();
  
  if (userLoading || partnerLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (user) return <Navigate to="/dashboard" replace />;
  if (partner) return <Navigate to="/socio" replace />;
  
  return <>{children}</>;
};

const AdminPublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { admin, loading } = useAdmin();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return admin ? <Navigate to="/operaciones" replace /> : <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <PartnerProvider>
          <Router>
            <div className="App">
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <PublicRoute>
                      <Index />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/login" 
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  } 
                />
                <Route path="/recovery" element={<PublicRoute><Recovery /></PublicRoute>} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/socio" 
                  element={
                    <PartnerProtectedRoute>
                      <SocioDashboard />
                    </PartnerProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin-login" 
                  element={
                    <AdminPublicRoute>
                      <AdminLogin />
                    </AdminPublicRoute>
                  } 
                />
                <Route 
                  path="/operaciones" 
                  element={
                    <AdminProtectedRoute>
                      <Operaciones />
                    </AdminProtectedRoute>
                  } 
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Router>
        </PartnerProvider>
      </AdminProvider>
    </AuthProvider>
  );
}

export default App;