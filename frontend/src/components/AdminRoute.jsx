import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

export default function AdminRoute({ children }) {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      {user?.role === 'super_admin' ? children : <Navigate to="/" replace />}
    </ProtectedRoute>
  );
}
