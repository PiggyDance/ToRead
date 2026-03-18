/** 待阅读条目 */
export interface ReadItem {
  /** 唯一标识 */
  id: string;
  /** 页面标题 */
  title: string;
  /** 页面 URL */
  url: string;
  /** 页面 favicon URL */
  favicon?: string;
  /** 添加时间 (ISO string) */
  createdAt: string;
  /** 是否已读 */
  isRead: boolean;
  /** 页面摘要（meta description 优先） */
  summary?: string;
  /** 用户标签 */
  tags?: string[];
}

/** 存储数据结构 */
export interface StorageData {
  items: ReadItem[];
}

/** Background 与 SidePanel 之间的消息类型 */
export type Message =
  | { type: 'ADD_CURRENT_PAGE' }
  | { type: 'PAGE_ADDED'; item: ReadItem }
  | { type: 'PAGE_ALREADY_EXISTS'; url: string }
  | { type: 'ERROR'; message: string };
