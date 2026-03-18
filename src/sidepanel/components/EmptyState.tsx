import type { FC } from 'react';

interface EmptyStateProps {
  filterActive: boolean;
}

export const EmptyState: FC<EmptyStateProps> = ({ filterActive }) => {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="16" y="8" width="32" height="48" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
          <path d="M28 36 L32 32 L36 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="32" y1="32" x2="32" y2="44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="empty-title">
        {filterActive ? '没有符合筛选条件的文章' : '待阅读列表为空'}
      </h3>
      <p className="empty-description">
        {filterActive
          ? '试试切换筛选条件'
          : '按 Alt+Shift+S 或点击下方按钮，将当前页面添加到列表'}
      </p>
    </div>
  );
};
