import { Link } from 'react-router-dom';
import AuthBrandHeader from '../components/AuthBrandHeader';

const CONTACT_EMAIL = 'mufazzelanis@gmail.com';
const BRAND = 'HiT Tech Pro';
const LAST_UPDATED = 'August 28, 2026';

export default function Privacy() {
  return (
    <div className="legal-page">
      <AuthBrandHeader />
      <div className="legal-card">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

        <p>
          {BRAND} ("we", "us", "our") provides a dashboard that lets you compose,
          preview, and schedule posts for publishing to social media platforms you
          choose to connect — currently Facebook, Instagram, LinkedIn, Telegram, and
          TikTok. This policy explains what information we collect, why, and how it
          is handled.
        </p>

        <h2>1. Information we collect</h2>
        <ul>
          <li><strong>Account information</strong> — your name, email address, and phone number when you register.</li>
          <li><strong>Content you create</strong> — the text, images, and videos you write or upload to compose a post, and the schedule you set for it.</li>
          <li><strong>Connected platform access</strong> — when you connect a social account (e.g. via "Connect Facebook" or "Connect TikTok"), the platform issues us an access token authorizing us to publish on your behalf. We store this token; we do not receive or store your platform password.</li>
          <li><strong>Basic usage data</strong> — standard technical logs (timestamps, IP address, browser type) used for security and troubleshooting.</li>
        </ul>

        <h2>2. How we use this information</h2>
        <ul>
          <li>To publish the posts you compose to the platforms you connect, at the time you schedule.</li>
          <li>To show you an accurate preview of how your post will look on each platform before it goes out.</li>
          <li>To maintain your account, keep you signed in, and let you manage connected accounts and post history.</li>
          <li>To keep the service secure and diagnose problems.</li>
        </ul>

        <h2>3. How we share information</h2>
        <p>
          We do not sell your personal data. Your post content and media are sent
          only to the specific platform(s) you choose, through their official APIs,
          solely to carry out the publishing action you requested. We do not share
          your data with any other third party for advertising or marketing
          purposes.
        </p>

        <h2>4. Data storage and security</h2>
        <p>
          Access tokens and account data are stored on our servers with access
          restricted to what the service needs to operate. You can disconnect any
          connected social account at any time from your dashboard, which revokes
          our ability to publish to it going forward.
        </p>

        <h2>5. Data retention and deletion</h2>
        <p>
          We keep your account data and post history for as long as your account is
          active. You may request deletion of your account and associated data at
          any time by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>6. Your choices</h2>
        <p>
          You can review, edit, or delete your posts, disconnect any social account,
          and update your profile information directly from your dashboard at any
          time, without needing to contact us.
        </p>

        <h2>7. Children's privacy</h2>
        <p>
          This service is intended for business and professional use and is not
          directed at children. We do not knowingly collect information from
          children under 13.
        </p>

        <h2>8. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. Material changes will be
          reflected by updating the "Last updated" date above.
        </p>

        <h2>9. Contact us</h2>
        <p>
          Questions about this policy or your data? Email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <p className="legal-footer-nav">
          <Link to="/terms">Terms of Service</Link> · <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
