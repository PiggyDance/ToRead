import type { FC } from 'react';
import { useReadItems } from './hooks/useReadItems';
import { ReadItemCard } from './components/ReadItemCard';
import { FilterBar } from './components/FilterBar';
import { EmptyState } from './components/EmptyState';
import { t } from './utils/i18n';

export const App: FC = () => {
  const {
    items,
    loading,
    filter,
    setFilter,
    counts,
    addCurrentPage,
    remove,
    toggleRead,
    clearRead,
  } = useReadItems();

  if (loading) {
    return (
      <div className="app loading-container">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="app">
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
          {counts.read > 0 && (
            <button className="clear-read-btn" onClick={clearRead}>
              {t.clearRead}
            </button>
          )}
        </div>
        <FilterBar filter={filter} onFilterChange={setFilter} counts={counts} />
      </header>

      {/* 列表 */}
      <main className="item-list">
        {items.length === 0 ? (
          <EmptyState filterActive={filter !== 'all'} />
        ) : (
          items.map((item) => (
            <ReadItemCard
              key={item.id}
              item={item}
              onToggleRead={toggleRead}
              onRemove={remove}
            />
          ))
        )}
      </main>

      {/* 底部操作栏 */}
      <footer className="app-footer">
        <button className="add-btn" onClick={addCurrentPage}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t.addCurrentPage}
        </button>
      </footer>
    </div>
  );
};
