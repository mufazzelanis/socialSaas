import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import AuthBrandHeader from '../components/AuthBrandHeader';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.post('/forgot-password', { email });
      setMessage(res.data.message);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthBrandHeader />
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Forgot your password?</h1>
        <p className="auth-subtitle">
          Enter your account email and we'll send you a reset link.
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {sent ? (
          <div className="alert alert-success">{message}</div>
        ) : (
          <>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Sending...' : 'Send Reset Link'}
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
