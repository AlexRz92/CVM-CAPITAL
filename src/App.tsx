import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminProvider, useAdmin } from './contexts/AdminContext';
import { PartnerProvider, usePartner } from './contexts/PartnerContext';
import { OperadorProvider, useOperador } from './contexts/OperadorContext';
import { ModuloProvider } from './contexts/ModuloContext';
import { Index } from './pages';
import { PublicRegister } from './pages';
import { Login, Recovery } from './components/Auth';
import { OverviewDashboard } from './components/Dashboard';
import { ModuloDashboard } from './components/Modulo';
import { Operaciones } from './components/Admin';
import { OperadorDashboard } from './components/Operador';
import { SocioOverviewDashboard } from './components/Socio';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/" replace />;
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
  
  return admin ? <>{children}</> : <Navigate to="/" replace />;
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
  
  return partner ? <>{children}</> : <Navigate to="/" replace />;
};

const OperadorProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { operador, loading } = useOperador();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return operador ? <>{children}</> : <Navigate to="/" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: userLoading } = useAuth();
  const { partner, loading: partnerLoading } = usePartner();
  const { operador, loading: operadorLoading } = useOperador();
  
  if (userLoading || partnerLoading || operadorLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (user) return <Navigate to="/dashboard" replace />;
  if (partner) return <Navigate to="/socio" replace />;
  if (operador) return <Navigate to="/operador" replace />;
  
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
          <OperadorProvider>
            <ModuloProvider>
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
                    <Route path="/registro" element={<PublicRegister />} />
                    <Route 
                      path="/dashboard" 
                      element={
                        <ProtectedRoute>
                          <OverviewDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/cvm-capital" 
                      element={
                        <ProtectedRoute>
                          <OverviewDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/modulo" 
                      element={
                        <ProtectedRoute>
                          <ModuloDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/socio" 
                      element={
                        <PartnerProtectedRoute>
                          <SocioOverviewDashboard />
                        </PartnerProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/socio-cvm-capital" 
                      element={
                        <PartnerProtectedRoute>
                          <SocioOverviewDashboard />
                        </PartnerProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/socio-modulo" 
                      element={
                        <PartnerProtectedRoute>
                          <ModuloDashboard />
                        </PartnerProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/operador" 
                      element={
                        <OperadorProtectedRoute>
                          <OperadorDashboard />
                        </OperadorProtectedRoute>
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
            </ModuloProvider>
          </OperadorProvider>
        </PartnerProvider>
      </AdminProvider>
    </AuthProvider>
  );
}

export default App;