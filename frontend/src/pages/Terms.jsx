import { Link } from 'react-router-dom';
import AuthBrandHeader from '../components/AuthBrandHeader';

const CONTACT_EMAIL = 'mufazzelanis@gmail.com';
const BRAND = 'HiT Tech Pro';
const LAST_UPDATED = 'August 28, 2026';

export default function Terms() {
  return (
    <div className="legal-page">
      <AuthBrandHeader />
      <div className="legal-card">
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

        <p>
          These Terms of Service ("Terms") govern your use of {BRAND} (the
          "Service"), a dashboard for composing, previewing, and scheduling posts to
          social media platforms you connect. By creating an account or using the
          Service, you agree to these Terms.
        </p>

        <h2>1. The Service</h2>
        <p>
          The Service lets you write a post once, preview how it will look on each
          connected platform, and either publish it immediately or schedule it for
          a later time. Publishing happens by sending your content to the official
          API of each platform you have connected (Facebook, Instagram, LinkedIn,
          Telegram, TikTok), using an authorization you grant when you connect that
          account.
        </p>

        <h2>2. Your account</h2>
        <p>
          You're responsible for the accuracy of the information you provide and for
          keeping your login credentials secure. You're responsible for all activity
          that happens under your account.
        </p>

        <h2>3. Connecting third-party platforms</h2>
        <p>
          When you connect a social account, you authorize us to publish content to
          it strictly as instructed by you through the Service. We only publish what
          you compose and schedule — we never post on your behalf without your
          explicit action. You can revoke this authorization at any time by
          disconnecting the account from your dashboard.
        </p>
        <p>
          Your use of each connected platform through the Service is still subject
          to that platform's own terms and policies (e.g. Meta's Platform Terms for
          Facebook/Instagram, LinkedIn's User Agreement, Telegram's Terms of
          Service, and TikTok's Terms of Service and Community Guidelines). You are
          responsible for complying with them.
        </p>

        <h2>4. Acceptable use</h2>
        <p>You agree not to use the Service to post content that:</p>
        <ul>
          <li>Is illegal, fraudulent, or infringes someone else's rights;</li>
          <li>Is spam, or violates the acceptable-use policy of any platform you publish to;</li>
          <li>Is harassing, hateful, or intended to deceive.</li>
        </ul>
        <p>
          We reserve the right to suspend accounts that misuse the Service in these
          ways.
        </p>

        <h2>5. Your content</h2>
        <p>
          You retain all rights to the text, images, and videos you create or
          upload. By using the Service, you grant us only the limited permission
          needed to process and transmit that content to the platform(s) you
          direct it to.
        </p>

        <h2>6. Availability</h2>
        <p>
          We aim to deliver scheduled posts at the time you set, but delivery
          depends on the availability and behavior of each third-party platform's
          API, which is outside our control. A platform may delay, reject, or
          remove content according to its own rules; we are not responsible for
          those outcomes.
        </p>

        <h2>7. Termination</h2>
        <p>
          You may stop using the Service and delete your account at any time. We
          may suspend or terminate accounts that violate these Terms.
        </p>

        <h2>8. Disclaimer and limitation of liability</h2>
        <p>
          The Service is provided "as is" without warranties of any kind. To the
          fullest extent permitted by law, {BRAND} is not liable for indirect,
          incidental, or consequential damages arising from your use of the
          Service.
        </p>

        <h2>9. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the Service
          after a change constitutes acceptance of the updated Terms.
        </p>

        <h2>10. Contact us</h2>
        <p>
          Questions about these Terms? Email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <p className="legal-footer-nav">
          <Link to="/privacy">Privacy Policy</Link> · <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
