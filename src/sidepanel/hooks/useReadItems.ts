import { useState, useEffect, useCallback } from 'react';
import type { ReadItem } from '../../types';
import { getItems, addItem, removeItem, toggleRead, clearRead, onItemsChanged } from '../../storage';

export type FilterMode = 'all' | 'unread' | 'read';

export function useReadItems() {
  const [items, setItems] = useState<ReadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>('all');

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

  const filteredItems = items.filter((item) => {
    if (filter === 'unread') return !item.isRead;
    if (filter === 'read') return item.isRead;
    return true;
  });

  const counts = {
    all: items.length,
    unread: items.filter((i) => !i.isRead).length,
    read: items.filter((i) => i.isRead).length,
  };

  return {
    items: filteredItems,
    allItems: items,
    loading,
    filter,
    setFilter,
    counts,
    addCurrentPage: handleAddCurrentPage,
    remove: handleRemove,
    toggleRead: handleToggleRead,
    clearRead: handleClearRead,
  };
}

// 为 addItem 创建直接暴露，方便外部使用
export { addItem };
