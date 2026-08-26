import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import { useBrand } from '../context/BrandContext';

const COLOR_PRESETS = [
  '#4f46e5', // indigo
  '#2563eb', // blue
  '#0891b2', // cyan
  '#16a34a', // green
  '#d97706', // amber
  '#dc2626', // red
  '#db2777', // pink
  '#7c3aed', // violet
  '#14151a', // near-black
];

export default function Settings() {
  const { brand, reload } = useBrand();

  const [brandName, setBrandName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  const [faviconFile, setFaviconFile] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(null);
  const [removeFavicon, setRemoveFavicon] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBrandName(brand.brand_name || '');
    setPrimaryColor(brand.primary_color || '#4f46e5');
    setLogoPreview(brand.logo_url || null);
    setFaviconPreview(brand.favicon_url || null);
  }, [brand]);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    setRemoveLogo(false);
    if (file) setLogoPreview(URL.createObjectURL(file));
  };

  const handleFaviconChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFaviconFile(file);
    setRemoveFavicon(false);
    if (file) setFaviconPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
  };

  const handleRemoveFavicon = () => {
    setFaviconFile(null);
    setFaviconPreview(null);
    setRemoveFavicon(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('brand_name', brandName || '');
      form.append('primary_color', primaryColor);
      if (logoFile) form.append('logo', logoFile);
      if (faviconFile) form.append('favicon', faviconFile);
      if (removeLogo) form.append('remove_logo', '1');
      if (removeFavicon) form.append('remove_favicon', '1');

      await api.post('/brand-settings', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setLogoFile(null);
      setFaviconFile(null);
      setRemoveLogo(false);
      setRemoveFavicon(false);
      setSuccess('Branding updated successfully.');
      reload();
    } catch (err) {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setError(firstError || err.response?.data?.message || 'Could not save branding.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <h1>Settings</h1>
      <p className="page-subtitle">Customize how your dashboard looks — logo, favicon and brand color.</p>

      <form className="card" onSubmit={handleSubmit}>
        <h2>Branding</h2>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="upload-grid">
          <div className="upload-box">
            <h3>Logo</h3>
            <p className="upload-hint">
              Shown in the sidebar (and mobile header). PNG/SVG/WebP, up to 2MB. Renders up to
              56px tall — a wide logo with transparent background looks best; a tiny/low-res
              image will look small or blurry no matter what.
            </p>
            <div className="upload-preview">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" />
              ) : (
                <span className="upload-preview-empty">No logo set</span>
              )}
            </div>
            <div className="upload-actions">
              <label className="file-input-label">
                📤 Upload Logo
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoChange} />
              </label>
              {logoPreview && (
                <button type="button" className="btn btn-ghost btn-danger btn-small" onClick={handleRemoveLogo}>
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="upload-box">
            <h3>Favicon</h3>
            <p className="upload-hint">
              Shown in the browser tab. PNG/ICO/SVG, up to 512KB. Browsers shrink this down to
              roughly 16–32px, so use a simple, square, high-contrast image (a plain icon or
              monogram works far better than a detailed logo, which turns into a blur that
              small).
            </p>
            <div className="upload-preview favicon-preview">
              {faviconPreview ? (
                <img src={faviconPreview} alt="Favicon preview" />
              ) : (
                <span className="upload-preview-empty">No favicon set</span>
              )}
            </div>
            <div className="upload-actions">
              <label className="file-input-label">
                📤 Upload Favicon
                <input type="file" accept="image/png,image/x-icon,image/svg+xml,image/jpeg" onChange={handleFaviconChange} />
              </label>
              {faviconPreview && (
                <button type="button" className="btn btn-ghost btn-danger btn-small" onClick={handleRemoveFavicon}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <label className="field">
          <span>Brand Name</span>
          <input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Social SaaS"
          />
        </label>

        <label className="field">
          <span>Primary Color</span>
          <div className="color-row">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
            />
            <div className="color-swatches">
              {COLOR_PRESETS.map((c) => (
                <span
                  key={c}
                  className={'color-swatch' + (primaryColor.toLowerCase() === c ? ' active' : '')}
                  style={{ background: c }}
                  onClick={() => setPrimaryColor(c)}
                />
              ))}
            </div>
          </div>
        </label>

        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving...' : 'Save Branding'}
        </button>
      </form>
    </Layout>
  );
}
