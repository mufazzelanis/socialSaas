import Icon from './Icon';

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

// Shared media block — one item renders full-size; 2+ shows the first item
// with a "1/N" badge, since none of these mockups need to be a working
// carousel, just make clear more than one item is attached.
function PreviewMedia({ media, square, tall }) {
  if (!media || media.length === 0) return null;
  const first = media[0];
  const variant = square ? ' pv-media--square' : tall ? ' pv-media--tall' : '';

  return (
    <div className={'pv-media' + variant}>
      {first.kind === 'video' ? (
        <video src={first.preview} className="pv-media-el" muted />
      ) : (
        <img src={first.preview} alt="" className="pv-media-el" />
      )}
      {media.length > 1 && <span className="pv-media-badge">1/{media.length}</span>}
    </div>
  );
}

function FacebookMock({ name, content, media }) {
  return (
    <div className="pv-card">
      <div className="pv-header">
        <span className="pv-avatar pv-avatar--fb">{initials(name)}</span>
        <div>
          <strong className="pv-name">{name}</strong>
          <div className="pv-meta">
            Just now <Icon name="globe" size={11} />
          </div>
        </div>
      </div>
      {content && <p className="pv-text">{content}</p>}
      <PreviewMedia media={media} />
      <div className="pv-stats">24 · 5 comments · 2 shares</div>
      <div className="pv-actions">
        <span>
          <Icon name="thumbs-up" size={16} /> Like
        </span>
        <span>
          <Icon name="comment" size={16} /> Comment
        </span>
        <span>
          <Icon name="share" size={16} /> Share
        </span>
      </div>
    </div>
  );
}

function InstagramMock({ name, content, media }) {
  return (
    <div className="pv-card">
      <div className="pv-header">
        <span className="pv-avatar pv-avatar--ig">{initials(name)}</span>
        <strong className="pv-name">{name}</strong>
        <Icon name="dots" size={16} className="pv-header-trailing" />
      </div>
      <PreviewMedia media={media} square />
      <div className="pv-ig-actions">
        <Icon name="heart" size={20} />
        <Icon name="comment" size={20} />
        <Icon name="paper-plane" size={20} />
        <Icon name="bookmark" size={20} className="pv-ig-save" />
      </div>
      <div className="pv-stats">128 likes</div>
      {content && (
        <p className="pv-text">
          <strong>{name}</strong> {content}
        </p>
      )}
    </div>
  );
}

function TelegramMock({ name, content, media }) {
  return (
    <div className="pv-card pv-card--tg-wrap">
      <div className="pv-tg-bubble">
        <div className="pv-header">
          <span className="pv-avatar pv-avatar--tg">{initials(name)}</span>
          <strong className="pv-name">{name}</strong>
        </div>
        <PreviewMedia media={media} />
        {content && <p className="pv-text">{content}</p>}
        <div className="pv-tg-meta">
          1.2K views · 12:34 <Icon name="check" size={12} />
        </div>
      </div>
    </div>
  );
}

function LinkedInMock({ name, content, media }) {
  return (
    <div className="pv-card">
      <div className="pv-header">
        <span className="pv-avatar pv-avatar--li">{initials(name)}</span>
        <div>
          <strong className="pv-name">{name}</strong>
          <div className="pv-meta">
            Just now <Icon name="globe" size={11} />
          </div>
        </div>
      </div>
      {content && <p className="pv-text">{content}</p>}
      <PreviewMedia media={media} />
      <div className="pv-stats">45 reactions · 8 comments</div>
      <div className="pv-actions">
        <span>
          <Icon name="thumbs-up" size={16} /> Like
        </span>
        <span>
          <Icon name="comment" size={16} /> Comment
        </span>
        <span>
          <Icon name="repeat" size={16} /> Repost
        </span>
        <span>
          <Icon name="paper-plane" size={16} /> Send
        </span>
      </div>
    </div>
  );
}

// TikTok gets a full-height "phone stage" treatment instead of the generic
// feed-post card — a vertical video with the caption and action icons
// overlaid on top, since that's what actually distinguishes it (and
// reflects that TikTok posts through this app are video-only).
function TikTokMock({ name, content, media }) {
  const hasVideo = media.length > 0;

  return (
    <div className="pv-card pv-tt-wrap">
      <div className="pv-tt-stage">
        {hasVideo ? (
          <PreviewMedia media={media} tall />
        ) : (
          <div className="pv-tt-placeholder">
            <Icon name="music-note" size={26} />
            <span>Add a video to preview</span>
          </div>
        )}
        <div className="pv-tt-side">
          <span className="pv-avatar pv-avatar--tt">{initials(name)}</span>
          <span className="pv-tt-action">
            <Icon name="heart" size={22} />
            128
          </span>
          <span className="pv-tt-action">
            <Icon name="comment" size={22} />
            24
          </span>
          <span className="pv-tt-action">
            <Icon name="share" size={22} />
            Share
          </span>
        </div>
        <div className="pv-tt-caption">
          <strong className="pv-tt-name">@{name}</strong>
          {content && <p className="pv-tt-text">{content}</p>}
          <div className="pv-tt-sound">
            <Icon name="music-note" size={12} /> original sound
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a mockup of how a post will actually look on the given platform —
 * not pixel-perfect, but close enough in layout/color that a user gets a
 * real feel for it before publishing, rather than one generic card.
 */
export default function PlatformPreview({ platform, name, content, mediaFiles }) {
  const media = mediaFiles || [];

  switch (platform) {
    case 'facebook':
      return <FacebookMock name={name} content={content} media={media} />;
    case 'instagram':
      return <InstagramMock name={name} content={content} media={media} />;
    case 'telegram':
      return <TelegramMock name={name} content={content} media={media} />;
    case 'linkedin':
      return <LinkedInMock name={name} content={content} media={media} />;
    case 'tiktok':
      return <TikTokMock name={name} content={content} media={media} />;
    default:
      return null;
  }
}
