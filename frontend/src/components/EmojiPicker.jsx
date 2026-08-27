import { useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

// A hand-curated set (not a full unicode emoji database — that's a heavy
// dependency for what's really just quick-access to the ones people
// actually reach for in a social post) grouped the way most native pickers
// do, so it still feels complete rather than a random grab-bag.
const CATEGORIES = [
  {
    label: 'Smileys',
    tab: '😊',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃',
      '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😝', '🤪', '🤔', '🙄', '😐',
      '😴', '🥱', '😷', '🤕', '🥳', '😎', '🤓', '🧐', '😢', '😭', '😡', '🤯',
    ],
  },
  {
    label: 'Gestures',
    tab: '👍',
    emojis: [
      '👍', '👎', '👏', '🙌', '👐', '🤝', '🙏', '💪', '✌️', '🤞', '🤟', '🤘',
      '👌', '🤙', '👋', '☝️', '👉', '👈', '👆', '👇', '🙋', '💁', '🤷', '🫶',
    ],
  },
  {
    label: 'Hearts',
    tab: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
      '💞', '💓', '💗', '💖', '💘', '💝', '💯', '✨',
    ],
  },
  {
    label: 'Celebrate',
    tab: '🎉',
    emojis: [
      '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🔥', '⭐', '🌟', '✅', '☑️', '✔️',
      '🆕', '📢', '📣', '🔔', '🚀', '💥', '⚡', '🎯',
    ],
  },
  {
    label: 'Business',
    tab: '💼',
    emojis: [
      '💼', '📈', '📉', '📊', '💰', '💵', '💳', '🛍️', '🛒', '📦', '💡', '🔑',
      '🔒', '📱', '💻', '🖥️', '📷', '🎥', '📝', '📅',
    ],
  },
  {
    label: 'Nature',
    tab: '🌸',
    emojis: [
      '☀️', '🌤️', '⛅', '🌧️', '❄️', '🌈', '🌙', '🌍', '🌱', '🌸', '🌺', '🍀',
      '🌊', '🔥', '⛰️', '🌴',
    ],
  },
];

/**
 * A button that opens a categorized emoji grid — reuses the app's modal
 * styling (bottom sheet on mobile, centered card on desktop) for
 * consistency with the other pickers (DateTimePicker).
 */
export default function EmojiPicker({ onSelect, buttonClassName = 'rte-btn', title = 'Insert emoji' }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(0);

  const pick = (emoji) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen(true)}
        title={title}
      >
        😊
      </button>

      {open &&
        createPortal(
          <div className="modal-overlay" onClick={() => setOpen(false)}>
            <div className="modal-panel emoji-picker-panel" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Close">
                <Icon name="x" size={18} />
              </button>
              <h3 className="dt-picker-title">Insert Emoji</h3>

              <div className="emoji-picker-tabs">
                {CATEGORIES.map((cat, i) => (
                  <button
                    type="button"
                    key={cat.label}
                    className={'emoji-picker-tab' + (category === i ? ' active' : '')}
                    onClick={() => setCategory(i)}
                    title={cat.label}
                  >
                    {cat.tab}
                  </button>
                ))}
              </div>

              <div className="emoji-picker-grid">
                {CATEGORIES[category].emojis.map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    className="emoji-picker-item"
                    onClick={() => pick(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
