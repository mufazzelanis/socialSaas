import BrandIcon from './BrandIcon';
import { useSiteSettings } from '../context/SiteSettingContext';

export default function TelegramFloatButton() {
  const ctx = useSiteSettings();
  const settings = ctx?.settings;

  if (!settings?.telegram_button_enabled || !settings?.telegram_channel_url) return null;

  return (
    <a
      href={settings.telegram_channel_url}
      target="_blank"
      rel="noopener noreferrer"
      className="telegram-float-btn"
      title="Join our Telegram channel"
      aria-label="Join our Telegram channel"
    >
      <BrandIcon name="telegram" size={20} />
      <span className="hidden sm:inline">Join Channel</span>
    </a>
  );
}
