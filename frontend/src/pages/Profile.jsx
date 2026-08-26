import { useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const payload = { name, email, phone: phone || undefined };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
        payload.new_password_confirmation = newPasswordConfirmation;
      }

      const res = await api.patch('/profile', payload);
      refreshUser(res.data);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
      setSuccess('Profile updated successfully.');
    } catch (err) {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setError(firstError || err.response?.data?.message || 'Could not update profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <h1>Profile</h1>
      <p className="page-subtitle">Update your name, email, phone and password.</p>

      <form className="card" onSubmit={handleSubmit}>
        <h2>Your Details</h2>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="form-row">
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
        </div>

        <label className="field">
          <span>Phone (optional)</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+8801XXXXXXXXX"
          />
        </label>

        <h2 className="mt-1">Change Password</h2>
        <p className="muted small">Leave these blank to keep your current password.</p>

        <div className="form-row">
          <label className="field">
            <span>Current Password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="field">
            <span>New Password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
            />
          </label>
        </div>

        <label className="field">
          <span>Confirm New Password</span>
          <input
            type="password"
            value={newPasswordConfirmation}
            onChange={(e) => setNewPasswordConfirmation(e.target.value)}
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </Layout>
  );
}
