import type { FC } from 'react';
import { t } from '../utils/i18n';

interface EmptyStateProps {
  filterActive: boolean;
  searchActive?: boolean;
}

const isMac = navigator.platform.toUpperCase().includes('MAC');

const ShortcutHint: FC = () => {
  const keys = isMac
    ? [<kbd key="ctrl" className="kbd">⌃ Ctrl</kbd>, <kbd key="shift" className="kbd">⇧ Shift</kbd>, <kbd key="s" className="kbd">S</kbd>]
    : [<kbd key="alt" className="kbd">Alt</kbd>, <kbd key="shift" className="kbd">Shift</kbd>, <kbd key="s" className="kbd">S</kbd>];

  return (
    <>
      {t.shortcutPrefix && <>{t.shortcutPrefix} </>}
      {keys}
      {t.shortcutSuffix && <> {t.shortcutSuffix}</>}
    </>
  );
};

export const EmptyState: FC<EmptyStateProps> = ({ filterActive, searchActive }) => {
  const title = searchActive
    ? t.emptyTitleSearch
    : filterActive
    ? t.emptyTitleFiltered
    : t.emptyTitle;

  const hint = searchActive
    ? t.emptyHintSearch
    : filterActive
    ? t.emptyHintFiltered
    : null;

  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="16" y="8" width="32" height="48" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
          <path d="M28 36 L32 32 L36 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="32" y1="32" x2="32" y2="44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-description">
        {hint ?? <ShortcutHint />}
      </p>
    </div>
  );
};
