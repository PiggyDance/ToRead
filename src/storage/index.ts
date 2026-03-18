import type { ReadItem, StorageData } from '../types';

const STORAGE_KEY = 'toread_data';

/** 获取所有待阅读条目 */
export async function getItems(): Promise<ReadItem[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const data: StorageData = result[STORAGE_KEY] ?? { items: [] };
  return data.items;
}

/** 保存所有条目 */
async function saveItems(items: ReadItem[]): Promise<void> {
  const data: StorageData = { items };
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

/** 添加条目（如已存在相同 URL 则跳过） */
export async function addItem(
  item: Omit<ReadItem, 'id' | 'createdAt' | 'isRead'>
): Promise<{ added: boolean; item?: ReadItem; existingUrl?: string }> {
  const items = await getItems();

  const exists = items.some((i) => i.url === item.url);
  if (exists) {
    return { added: false, existingUrl: item.url };
  }

  const newItem: ReadItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  items.unshift(newItem);
  await saveItems(items);

  return { added: true, item: newItem };
}

/** 删除条目 */
export async function removeItem(id: string): Promise<void> {
  const items = await getItems();
  await saveItems(items.filter((i) => i.id !== id));
}

/** 切换已读状态 */
export async function toggleRead(id: string): Promise<ReadItem | null> {
  const items = await getItems();
  const item = items.find((i) => i.id === id);
  if (!item) return null;

  item.isRead = !item.isRead;
  await saveItems(items);
  return item;
}

/** 清除所有已读条目 */
export async function clearRead(): Promise<void> {
  const items = await getItems();
  await saveItems(items.filter((i) => !i.isRead));
}

/** 监听存储变化 */
export function onItemsChanged(callback: (items: ReadItem[]) => void): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === 'local' && changes[STORAGE_KEY]) {
      const data: StorageData = changes[STORAGE_KEY].newValue ?? { items: [] };
      callback(data.items);
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
