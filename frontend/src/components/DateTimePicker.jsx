import { useEffect, useState } from 'react';
import Icon from './Icon';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABEL = { month: 'long', year: 'numeric' };

// Parses/formats the same "YYYY-MM-DDTHH:MM" shape <input type="datetime-local">
// uses, so this drops in wherever that native input used to be without the
// parent components needing to change how they read/send the value.
function parseValue(value) {
  if (!value) return null;
  const [datePart, timePart] = value.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  return { date: new Date(y, m - 1, d), time: timePart || '09:00' };
}

function toDatePart(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = startWeekday; i > 0; i--) {
    cells.push(new Date(year, month, 1 - i));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    cells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }

  return cells;
}

/**
 * A friendlier replacement for the bare <input type="datetime-local">:
 * a proper month calendar (matches the app's modal styling) for the date,
 * plus a native time input for the minute-level pick — reusing the native
 * control there rather than reinventing a wheel/list picker, since every
 * platform already renders that one well.
 */
export default function DateTimePicker({ value, onChange, min, placeholder = 'Pick date & time' }) {
  const [open, setOpen] = useState(false);
  const minParsed = min ? parseValue(min) : null;
  const valueParsed = parseValue(value);

  const [viewDate, setViewDate] = useState(valueParsed?.date || minParsed?.date || new Date());
  const [draftDate, setDraftDate] = useState(valueParsed?.date || null);
  const [draftTime, setDraftTime] = useState(valueParsed?.time || minParsed?.time || '09:00');

  // Re-sync the draft whenever the popover is (re)opened, so a previous
  // unconfirmed edit doesn't linger the next time it's opened.
  useEffect(() => {
    if (!open) return;
    const parsed = parseValue(value);
    setViewDate(parsed?.date || minParsed?.date || new Date());
    setDraftDate(parsed?.date || null);
    setDraftTime(parsed?.time || minParsed?.time || '09:00');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDateOnly = minParsed
    ? new Date(minParsed.date.getFullYear(), minParsed.date.getMonth(), minParsed.date.getDate())
    : null;

  const isDisabled = (cellDate) => minDateOnly && cellDate < minDateOnly;

  const changeMonth = (delta) => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  };

  const confirm = () => {
    if (!draftDate) return;
    onChange(`${toDatePart(draftDate)}T${draftTime}`);
    setOpen(false);
  };

  const cells = buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth());
  const timeMin = minDateOnly && draftDate && sameDay(draftDate, minDateOnly) ? minParsed.time : undefined;

  const displayLabel = valueParsed
    ? `${valueParsed.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · ${new Date(`2000-01-01T${valueParsed.time}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    : placeholder;

  return (
    <>
      <button type="button" className="dt-picker-trigger" onClick={() => setOpen(true)}>
        <Icon name="calendar" size={16} />
        <span className={valueParsed ? '' : 'muted'}>{displayLabel}</span>
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-panel dt-picker-panel" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Close">
              <Icon name="x" size={18} />
            </button>
            <h3 className="dt-picker-title">Select Date &amp; Time</h3>

            <div className="dt-picker-nav">
              <button type="button" className="dt-picker-nav-btn" onClick={() => changeMonth(-1)} aria-label="Previous month">
                <Icon name="chevron-left" size={18} />
              </button>
              <span className="dt-picker-month">{viewDate.toLocaleDateString(undefined, MONTH_LABEL)}</span>
              <button type="button" className="dt-picker-nav-btn" onClick={() => changeMonth(1)} aria-label="Next month">
                <Icon name="chevron-right" size={18} />
              </button>
            </div>

            <div className="dt-picker-weekdays">
              {WEEKDAYS.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="dt-picker-grid">
              {cells.map((cellDate) => {
                const inMonth = cellDate.getMonth() === viewDate.getMonth();
                const disabled = isDisabled(cellDate);
                const isToday = sameDay(cellDate, today);
                const isSelected = sameDay(cellDate, draftDate);
                return (
                  <button
                    type="button"
                    key={cellDate.toISOString()}
                    disabled={disabled}
                    onClick={() => setDraftDate(cellDate)}
                    className={
                      'dt-picker-day' +
                      (!inMonth ? ' dt-picker-day--muted' : '') +
                      (isToday ? ' dt-picker-day--today' : '') +
                      (isSelected ? ' dt-picker-day--selected' : '')
                    }
                  >
                    {cellDate.getDate()}
                  </button>
                );
              })}
            </div>

            <label className="field mt-3">
              <span>Time</span>
              <input
                type="time"
                value={draftTime}
                min={timeMin}
                onChange={(e) => setDraftTime(e.target.value)}
              />
            </label>

            <div className="post-edit-actions mt-3">
              <button type="button" className="btn btn-primary btn-small" disabled={!draftDate} onClick={confirm}>
                Confirm
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
