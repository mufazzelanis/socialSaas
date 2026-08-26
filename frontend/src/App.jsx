import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BrandProvider } from './context/BrandContext';
import { AdProvider } from './context/AdContext';
import { SiteSettingProvider } from './context/SiteSettingContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Login from './pages/Login';

// Every other page is loaded on demand — an unauthenticated visit (Login,
// mostly what search engines/PageSpeed actually see) only pays for the
// login page's own code, not the entire dashboard/admin bundle behind it.
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ConnectAccounts = lazy(() => import('./pages/ConnectAccounts'));
const CreatePost = lazy(() => import('./pages/CreatePost'));
const PostHistory = lazy(() => import('./pages/PostHistory'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function RouteFallback() {
  return <div className="page-loading">Loading...</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BrandProvider>
          <AdProvider>
            <SiteSettingProvider>
              <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/create"
                  element={
                    <ProtectedRoute>
                      <CreatePost />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/posts"
                  element={
                    <ProtectedRoute>
                      <PostHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/accounts"
                  element={
                    <ProtectedRoute>
                      <ConnectAccounts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <AdminRoute>
                      <Settings />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </Suspense>
            </SiteSettingProvider>
          </AdProvider>
        </BrandProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
