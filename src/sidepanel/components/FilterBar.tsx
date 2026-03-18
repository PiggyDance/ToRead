import type { FC } from 'react';
import type { FilterMode } from '../hooks/useReadItems';

interface FilterBarProps {
  filter: FilterMode;
  onFilterChange: (filter: FilterMode) => void;
  counts: {
    all: number;
    unread: number;
    read: number;
  };
}

const filters: { key: FilterMode; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
  { key: 'read', label: '已读' },
];

export const FilterBar: FC<FilterBarProps> = ({ filter, onFilterChange, counts }) => {
  return (
    <div className="filter-bar">
      {filters.map(({ key, label }) => (
        <button
          key={key}
          className={`filter-btn ${filter === key ? 'active' : ''}`}
          onClick={() => onFilterChange(key)}
        >
          {label}
          <span className="filter-count">{counts[key]}</span>
        </button>
      ))}
    </div>
  );
};
