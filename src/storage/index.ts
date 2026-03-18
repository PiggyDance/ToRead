import type { ReadItem, StorageData } from '../types';

const STORAGE_KEY = 'toread_data';

// 使用 sync 存储实现跨设备同步
// sync 有 100KB 总限制和单 key 8KB 限制，对于稍后读场景足够
const store = chrome.storage.sync;

/** 获取所有待阅读条目 */
export async function getItems(): Promise<ReadItem[]> {
  const result = await store.get(STORAGE_KEY);
  const data: StorageData = result[STORAGE_KEY] ?? { items: [] };
  return data.items;
}

/** 保存所有条目 */
async function saveItems(items: ReadItem[]): Promise<void> {
  const data: StorageData = { items };
  await store.set({ [STORAGE_KEY]: data });
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

/** 更新条目的摘要 */
export async function updateSummary(id: string, summary: string): Promise<void> {
  const items = await getItems();
  const item = items.find((i) => i.id === id);
  if (item) {
    item.summary = summary;
    await saveItems(items);
  }
}

/** 更新条目的 tags */
export async function updateTags(id: string, tags: string[]): Promise<void> {
  const items = await getItems();
  const item = items.find((i) => i.id === id);
  if (item) {
    item.tags = tags;
    await saveItems(items);
  }
}

/** 首次安装时写入演示条目（直接覆盖，不走去重逻辑） */
export async function seedDemoItems(items: ReadItem[]): Promise<void> {
  await saveItems(items);
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
    if (areaName === 'sync' && changes[STORAGE_KEY]) {
      const data: StorageData = changes[STORAGE_KEY].newValue ?? { items: [] };
      callback(data.items);
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
