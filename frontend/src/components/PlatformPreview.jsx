import Icon from './Icon';

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

// Shared media block — one item renders full-size; 2+ shows the first item
// with a "1/N" badge, since none of these mockups need to be a working
// carousel, just make clear more than one item is attached.
function PreviewMedia({ media, square }) {
  if (!media || media.length === 0) return null;
  const first = media[0];

  return (
    <div className={'pv-media' + (square ? ' pv-media--square' : '')}>
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
          12:34 <Icon name="check" size={12} />
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
    default:
      return null;
  }
}
