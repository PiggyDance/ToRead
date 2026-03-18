import { useState, useRef, useCallback, useEffect, type FC, type KeyboardEvent } from 'react';
import type { ReadItem } from '../../types';
import { formatRelativeTime } from '../utils/time';
import { t } from '../utils/i18n';

interface ReadItemCardProps {
  item: ReadItem;
  focused?: boolean;
  flashing?: boolean;
  activeTag?: string | null;
  allTags?: string[];
  onToggleRead: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  onTagClick: (tag: string) => void;
}

export const ReadItemCard: FC<ReadItemCardProps> = ({ item, focused, flashing, activeTag, allTags = [], onToggleRead, onRemove, onUpdateTags, onTagClick }) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  // 计算当前输入的补全候选：从全局 tags 中过滤掉已有的，再按输入过滤
  const suggestions = (() => {
    const existing = new Set(item.tags ?? []);
    const q = tagInput.trim().toLowerCase();
    return allTags.filter(
      (t) => !existing.has(t) && (q === '' || t.toLowerCase().includes(q))
    );
  })();

  // 每次 suggestions 出现或 input 位置变化时，重新计算 fixed 坐标
  useEffect(() => {
    if (suggestions.length > 0 && showTagInput && tagInputRef.current) {
      const rect = tagInputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    } else {
      setDropdownPos(null);
    }
  }, [suggestions.length, showTagInput, tagInput]);

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

  const handleMouseEnter = () => {
    if (!item.summary || item.isRead) return;
    hoverTimerRef.current = setTimeout(() => setSummaryExpanded(true), 100);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setSummaryExpanded(false);
  };

  const handleSelectSuggestion = useCallback((tag: string) => {
    const existing = item.tags ?? [];
    onUpdateTags(item.id, [...existing, tag]);
    setTagInput('');
    setSuggestionIndex(-1);
    // 选完后保持输入框聚焦，方便继续添加
    setTimeout(() => tagInputRef.current?.focus(), 0);
  }, [item.id, item.tags, onUpdateTags]);

  const handleAddTag = useCallback(() => {
    // 如果有高亮的候选项，优先选候选
    if (suggestionIndex >= 0 && suggestions[suggestionIndex]) {
      handleSelectSuggestion(suggestions[suggestionIndex]);
      return;
    }
    const tag = tagInput.trim();
    if (!tag) return;
    const existing = item.tags ?? [];
    if (existing.includes(tag)) {
      setTagInput('');
      return;
    }
    onUpdateTags(item.id, [...existing, tag]);
    setTagInput('');
    setSuggestionIndex(-1);
  }, [tagInput, suggestionIndex, suggestions, item.id, item.tags, onUpdateTags, handleSelectSuggestion]);

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      if (suggestions.length > 0 && suggestionIndex >= 0) {
        // 先关闭下拉
        setSuggestionIndex(-1);
      } else {
        setShowTagInput(false);
        setTagInput('');
        setSuggestionIndex(-1);
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    const updated = (item.tags ?? []).filter((t) => t !== tag);
    onUpdateTags(item.id, updated);
  };

  const handleShowTagInput = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTagInput(true);
    setSuggestionIndex(-1);
    setTimeout(() => tagInputRef.current?.focus(), 0);
  };

  const domain = (() => {
    try {
      return new URL(item.url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  })();

  // 摘要仅在未读且有内容时展示
  const showSummaryArea = !item.isRead && !!item.summary;
  const tags = item.tags ?? [];

  // 超过 7 天未读视为过期
  const isStale = !item.isRead && (() => {
    const created = new Date(item.createdAt).getTime();
    return Date.now() - created > 7 * 24 * 60 * 60 * 1000;
  })();

  return (
    <div
      className={`read-item-card ${item.isRead ? 'is-read' : ''} ${isStale ? 'is-stale' : ''} ${isRemoving ? 'removing' : ''} ${flashing ? 'read-flash' : ''} ${focused ? 'is-focused' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {flashing && (
        <div className="read-flash-overlay" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
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
          {showSummaryArea && (
            <div className={`card-summary ${summaryExpanded ? 'expanded' : ''}`}>
              {item.summary}
            </div>
          )}
          {/* Tag 区域 */}
          {(tags.length > 0 || showTagInput) && (
            <div className="card-tags" onClick={(e) => e.stopPropagation()}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={`card-tag ${activeTag === tag ? 'card-tag--active' : ''}`}
                  onClick={() => onTagClick(tag)}
                  role="button"
                  title={`按 ${tag} 过滤`}
                >
                  {tag}
                  <button
                    className="tag-remove"
                    onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag); }}
                    aria-label={`Remove tag ${tag}`}
                  >×</button>
                </span>
              ))}
              {showTagInput && (
                <div className="tag-input-wrap" onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={tagInputRef}
                    className="tag-input"
                    value={tagInput}
                    onChange={(e) => { setTagInput(e.target.value); setSuggestionIndex(-1); }}
                    onKeyDown={handleTagKeyDown}
                    onBlur={(e) => {
                      // 点击候选列表时不关闭（relatedTarget 在 suggestions 内）
                      if (suggestionsRef.current?.contains(e.relatedTarget as Node)) return;
                      handleAddTag();
                      setShowTagInput(false);
                      setSuggestionIndex(-1);
                    }}
                    placeholder="tag…"
                    maxLength={20}
                    autoComplete="off"
                  />
                  {suggestions.length > 0 && dropdownPos && (
                    <ul
                      className="tag-suggestions"
                      ref={suggestionsRef}
                      style={{ top: dropdownPos.top, left: dropdownPos.left }}
                    >
                      {suggestions.map((tag, idx) => (
                        <li
                          key={tag}
                          className={`tag-suggestion-item ${idx === suggestionIndex ? 'active' : ''}`}
                          onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(tag); }}
                          onMouseEnter={() => setSuggestionIndex(idx)}
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="card-actions">
        {/* 添加 Tag 按钮（hover 时显示） */}
        <button
          className="action-btn tag-add-btn"
          onClick={handleShowTagInput}
          title="Add tag"
          aria-label="Add tag"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        </button>
        <button
          className="action-btn toggle-read-btn"
          onClick={() => onToggleRead(item.id)}
          title={item.isRead ? t.markAsUnread : t.markAsRead}
          aria-label={item.isRead ? t.markAsUnread : t.markAsRead}
        >
          {item.isRead ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
        <button
          className="action-btn remove-btn"
          onClick={handleRemove}
          title={t.remove}
          aria-label={t.remove}
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
