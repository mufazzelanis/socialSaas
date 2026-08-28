import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import AuthBrandHeader from '../components/AuthBrandHeader';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { setSessionFromResponse } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token || !email) {
      setError('This reset link is invalid or incomplete. Please request a new one.');
      return;
    }

    setBusy(true);
    try {
      const res = await api.post('/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setSessionFromResponse(res.data);
      navigate('/');
    } catch (err) {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setError(firstError || err.response?.data?.message || 'Could not reset password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthBrandHeader />
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Set a new password</h1>
        <p className="auth-subtitle">for {email || 'your account'}</p>

        {error && <div className="alert alert-error">{error}</div>}

        {!token || !email ? (
          <div className="alert alert-error">
            This reset link is missing information. Please request a new one from the{' '}
            <Link to="/forgot-password">forgot password</Link> page.
          </div>
        ) : (
          <>
            <label className="field">
              <span>New Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>

            <label className="field">
              <span>Confirm New Password</span>
              <input
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                minLength={8}
                required
              />
            </label>

            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Resetting...' : 'Reset Password'}
            </button>
          </>
        )}

        <p className="auth-footer">
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </div>
  );
}
