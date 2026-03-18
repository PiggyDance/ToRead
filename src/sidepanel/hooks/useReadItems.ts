import { useState, useEffect, useCallback } from 'react';
import type { ReadItem } from '../../types';
import { getItems, addItem, removeItem, toggleRead, clearRead, onItemsChanged, updateTags } from '../../storage';

export type FilterMode = 'all' | 'unread';

export function useReadItems() {
  const [items, setItems] = useState<ReadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // 初始加载：有未读则默认展示"未读"，否则展示"全部"
  useEffect(() => {
    getItems().then((data) => {
      setItems(data);
      const hasUnread = data.some((item) => !item.isRead);
      setFilter(hasUnread ? 'unread' : 'all');
      setLoading(false);
    });

    // 监听存储变化（摘要写入后自动刷新）
    const unsubscribe = onItemsChanged((newItems) => {
      setItems(newItems);
    });

    return unsubscribe;
  }, []);

  const handleAddCurrentPage = useCallback(async () => {
    // 把当前窗口 ID 带给 background，让它找到正确的网页 tab
    const currentWindow = await chrome.windows.getCurrent();
    await chrome.runtime.sendMessage({
      type: 'ADD_CURRENT_PAGE',
      windowId: currentWindow.id,
    });
  }, []);

  const handleRemove = useCallback(async (id: string) => {
    await removeItem(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleToggleRead = useCallback(async (id: string) => {
    const updated = await toggleRead(id);
    if (updated) {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: updated.isRead } : item))
      );
    }
  }, []);

  const handleClearRead = useCallback(async () => {
    await clearRead();
    setItems((prev) => prev.filter((item) => !item.isRead));
  }, []);

  const handleUpdateTags = useCallback(async (id: string, tags: string[]) => {
    await updateTags(id, tags);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, tags } : item))
    );
  }, []);

  const filteredItems = items.filter((item) => {
    if (filter === 'unread' && item.isRead) return false;
    if (activeTag && !(item.tags ?? []).includes(activeTag)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = item.title.toLowerCase().includes(q);
      const domainMatch = (() => {
        try { return new URL(item.url).hostname.toLowerCase().includes(q); } catch { return false; }
      })();
      if (!titleMatch && !domainMatch) return false;
    }
    return true;
  });

  const counts = {
    all: items.length,
    unread: items.filter((i) => !i.isRead).length,
  };

  return {
    items: filteredItems,
    allItems: items,
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
    addCurrentPage: handleAddCurrentPage,
    remove: handleRemove,
    toggleRead: handleToggleRead,
    clearRead: handleClearRead,
    updateTags: handleUpdateTags,
  };
}

// 为 addItem 创建直接暴露，方便外部使用
export { addItem };
