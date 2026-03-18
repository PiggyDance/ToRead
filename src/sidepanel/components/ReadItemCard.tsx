import { useState, type FC } from 'react';
import type { ReadItem } from '../../types';
import { formatRelativeTime } from '../utils/time';

interface ReadItemCardProps {
  item: ReadItem;
  onToggleRead: (id: string) => void;
  onRemove: (id: string) => void;
}

export const ReadItemCard: FC<ReadItemCardProps> = ({ item, onToggleRead, onRemove }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => onRemove(item.id), 300);
  };

  const handleOpen = () => {
    chrome.tabs.create({ url: item.url });
    if (!item.isRead) {
      onToggleRead(item.id);
    }
  };

  const domain = (() => {
    try {
      return new URL(item.url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  })();

  return (
    <div className={`read-item-card ${item.isRead ? 'is-read' : ''} ${isRemoving ? 'removing' : ''}`}>
      <div className="card-main" onClick={handleOpen} role="button" tabIndex={0}>
        <div className="card-favicon">
          {item.favicon ? (
            <img
              src={item.favicon}
              alt=""
              width={16}
              height={16}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <span className={`favicon-fallback ${item.favicon ? 'hidden' : ''}`}>
            {domain.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="card-content">
          <h3 className="card-title">{item.title}</h3>
          <div className="card-meta">
            <span className="card-domain">{domain}</span>
            <span className="card-time">{formatRelativeTime(item.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className="card-actions">
        <button
          className="action-btn toggle-read-btn"
          onClick={() => onToggleRead(item.id)}
          title={item.isRead ? '标记为未读' : '标记为已读'}
          aria-label={item.isRead ? '标记为未读' : '标记为已读'}
        >
          {item.isRead ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
        <button
          className="action-btn remove-btn"
          onClick={handleRemove}
          title="删除"
          aria-label="删除"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
};
