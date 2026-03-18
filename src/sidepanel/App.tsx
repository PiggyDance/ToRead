import { useRef, useEffect, useState, type FC } from 'react';
import { useReadItems } from './hooks/useReadItems';
import { useKeyboard } from './hooks/useKeyboard';
import { ReadItemCard } from './components/ReadItemCard';
import { FilterBar } from './components/FilterBar';
import { EmptyState } from './components/EmptyState';
import { t } from './utils/i18n';

export const App: FC = () => {
  const listRef = useRef<HTMLElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const [flashingId, setFlashingId] = useState<string | null>(null);

  const {
    items,
    allItems,
    loading,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    activeTag,
    setActiveTag,
    focusedIndex,
    setFocusedIndex,
    counts,
    addCurrentPage,
    remove,
    toggleRead,
    clearRead,
    updateTags,
  } = useReadItems();

  // 收集全局所有已用 tag（去重、按使用频率排序）
  const allTags = Array.from(
    allItems.reduce((map, item) => {
      (item.tags ?? []).forEach((tag) => map.set(tag, (map.get(tag) ?? 0) + 1));
      return map;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  const handleTagClick = (tag: string) => {
    setActiveTag(activeTag === tag ? null : tag);
  };

  // 统一的已读切换：标记为已读时先播动画再更新，标记为未读时直接更新
  const handleToggleReadWithFlash = (id: string, isCurrentlyRead: boolean) => {
    if (!isCurrentlyRead) {
      setFlashingId(id);
      setTimeout(() => {
        setFlashingId(null);
        toggleRead(id);
      }, 600);
    } else {
      toggleRead(id);
    }
  };

  // 键盘导航时自动滚动到聚焦卡片
  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return;
    const cards = listRef.current.querySelectorAll('.read-item-card');
    const card = cards[focusedIndex] as HTMLElement | undefined;
    card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusedIndex]);

  useKeyboard({
    items,
    focusedIndex,
    setFocusedIndex,
    onOpen: (item) => {
      chrome.tabs.create({ url: item.url });
      if (!item.isRead) handleToggleReadWithFlash(item.id, false);
      setTimeout(() => appRef.current?.focus(), 100);
    },
    onToggleRead: (id) => {
      const item = items.find((i) => i.id === id);
      if (item) handleToggleReadWithFlash(id, item.isRead);
    },
    onRemove: remove,
    searchActive: !!searchQuery,
  });

  if (loading) {
    return (
      <div className="app loading-container">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="app" ref={appRef} tabIndex={-1}>
      {/* 头部 */}
      <header className="app-header">
        <div className="header-top">
          <div className="title-group">
            <h1 className="app-title">
              <svg className="logo-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              </svg>
              ToRead
            </h1>
            <span className="app-slogan">{t.appSlogan}</span>
          </div>
          <div className="header-actions">
            {allItems.some((i) => i.isRead) && (
              <button className="clear-read-btn" onClick={clearRead}>
                {t.clearRead}
              </button>
            )}
            <button className="add-btn-icon" onClick={addCurrentPage} title={t.addCurrentPage}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
        <FilterBar filter={filter} onFilterChange={setFilter} counts={counts} />
        {/* 激活 Tag 过滤条 */}
        {activeTag && (
          <div className="active-tag-bar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <span className="active-tag-label">{activeTag}</span>
            <button className="active-tag-clear" onClick={() => setActiveTag(null)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        {/* 搜索框 */}
        <div className="search-bar">
          <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* 列表 */}
      <main className="item-list" ref={listRef}>
        {items.length === 0 ? (
          <EmptyState filterActive={false} searchActive={!!searchQuery} />
        ) : (
          items.map((item, idx) => (
            <ReadItemCard
              key={item.id}
              item={item}
              focused={idx === focusedIndex}
              flashing={item.id === flashingId}
              activeTag={activeTag}
              allTags={allTags}
              onToggleRead={(id) => handleToggleReadWithFlash(id, item.isRead)}
              onRemove={remove}
              onUpdateTags={updateTags}
              onTagClick={handleTagClick}
            />
          ))
        )}
      </main>
    </div>
  );
};
