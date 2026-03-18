import { useEffect, useCallback } from 'react';
import type { ReadItem } from '../../types';

interface UseKeyboardOptions {
  items: ReadItem[];
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  onOpen: (item: ReadItem) => void;
  onToggleRead: (id: string) => void;
  onRemove: (id: string) => void;
  searchActive: boolean;
}

export function useKeyboard({
  items,
  focusedIndex,
  setFocusedIndex,
  onOpen,
  onToggleRead,
  onRemove,
  searchActive,
}: UseKeyboardOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 搜索框聚焦时不拦截（除了 Escape）
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (isInput && e.key !== 'Escape') return;

      if (items.length === 0) return;

      switch (e.key) {
        case 'j':
        case 'ArrowDown': {
          if (isInput) return;
          e.preventDefault();
          setFocusedIndex(Math.min(focusedIndex + 1, items.length - 1));
          break;
        }
        case 'k':
        case 'ArrowUp': {
          if (isInput) return;
          e.preventDefault();
          setFocusedIndex(Math.max(focusedIndex - 1, 0));
          break;
        }
        case 'Enter': {
          if (isInput) return;
          e.preventDefault();
          const item = items[focusedIndex];
          if (item) onOpen(item);
          break;
        }
        case 'r':
        case 'R': {
          if (isInput) return;
          e.preventDefault();
          const item = items[focusedIndex];
          if (item) onToggleRead(item.id);
          break;
        }
        case 'd':
        case 'D': {
          if (isInput) return;
          e.preventDefault();
          const item = items[focusedIndex];
          if (item) {
            onRemove(item.id);
            setFocusedIndex(Math.min(focusedIndex, items.length - 2));
          }
          break;
        }
        case 'Escape': {
          // 搜索框 Escape 由搜索框自身处理，这里处理失焦
          if (!isInput) setFocusedIndex(-1);
          break;
        }
      }
    },
    [items, focusedIndex, setFocusedIndex, onOpen, onToggleRead, onRemove, searchActive]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
