import { addItem, updateSummary, getItems, seedDemoItems } from '../storage';
import type { ReadItem } from '../types';

// ---- Badge：常驻显示未读数 ----

async function updateBadge(): Promise<void> {
  const items = await getItems();
  const unreadCount = items.filter((i) => !i.isRead).length;
  const text = unreadCount > 0 ? String(unreadCount > 99 ? '99+' : unreadCount) : '';
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: '#e8553a' });
}

// 监听 storage.sync 变化，实时更新 badge
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes['toread_data']) {
    updateBadge();
  }
});

// ---- Session 缓存：tabId → 页面摘要（跨 service worker 重启持久化）----

async function cacheSummary(tabId: number, summary: string): Promise<void> {
  await chrome.storage.session.set({ [`summary_${tabId}`]: summary });
}

async function getCachedSummary(tabId: number, retries = 5, intervalMs = 200): Promise<string> {
  for (let i = 0; i < retries; i++) {
    const result = await chrome.storage.session.get(`summary_${tabId}`);
    const summary = result[`summary_${tabId}`] ?? '';
    if (summary) return summary;
    if (i < retries - 1) await new Promise((r) => setTimeout(r, intervalMs));
  }
  return '';
}

// tab 关闭时清理缓存
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(`summary_${tabId}`);
});

// ---- 获取 Tab ----

async function getActiveTab(windowId?: number): Promise<chrome.tabs.Tab | null> {
  const query = windowId
    ? { active: true, windowId }
    : { active: true, lastFocusedWindow: true };
  const tabs = await chrome.tabs.query(query);
  const webTab = tabs.find(
    (t) => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://')
  );
  return webTab ?? null;
}

// ---- 添加页面 ----

async function doAddCurrentPage(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab?.url || !tab.title || !tab.id) return;
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

  const result = await addItem({
    title: tab.title,
    url: tab.url,
    favicon: tab.favIconUrl,
  });

  if (!result.added) {
    // 已存在：短暂显示"…"提示，2s 后恢复全局 badge
    await chrome.action.setBadgeText({ text: '…', tabId: tab.id });
    await chrome.action.setBadgeBackgroundColor({ color: '#FF9800', tabId: tab.id });
    setTimeout(() => {
      if (tab.id) chrome.action.setBadgeText({ text: '', tabId: tab.id });
    }, 2000);
  }

  if (result.added && result.item) {
    const summary = await getCachedSummary(tab.id);
    console.log('[ToRead] 读取摘要缓存 tabId:', tab.id, '→', summary.slice(0, 30) || '(空)');
    if (summary) {
      await updateSummary(result.item.id, summary);
    }
  }
}

// ---- 扩展安装/更新时，向所有已打开的网页 tab 注入 content script ----

// ---- 首次安装演示数据 ----

function buildDemoItems(): ReadItem[] {
  const lang = chrome.i18n.getUILanguage().toLowerCase();
  const isChinese = lang.startsWith('zh');
  const isJapanese = lang.startsWith('ja');
  const isKorean = lang.startsWith('ko');

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  if (isChinese) {
    return [
      {
        id: crypto.randomUUID(),
        title: '👋 欢迎使用 ToRead！点击右上角 + 或快捷键，把当前页面加入列表',
        url: 'https://github.com/nicehash/NiceHashQuickMiner',
        favicon: '',
        summary: '点击卡片右侧的 ✓ 标记已读，按 D 删除，按 J/K 上下导航，按 Enter 打开页面。',
        createdAt: new Date(now - 1 * day).toISOString(),
        isRead: false,
        tags: ['使用指南'],
      },
      {
        id: crypto.randomUUID(),
        title: '🏷️ Tag 分类：给文章打标签，点击 Tag 可过滤同类内容',
        url: 'https://developer.chrome.com/docs/extensions',
        favicon: 'https://www.google.com/favicon.ico',
        summary: '悬停卡片，点击右侧标签图标即可添加 Tag。点击 Tag 可按标签过滤，与搜索框同时生效（AND 关系）。',
        createdAt: new Date(now - 2 * day).toISOString(),
        isRead: false,
        tags: ['功能演示'],
      },
      {
        id: crypto.randomUUID(),
        title: '🔍 搜索过滤：在顶部搜索框输入关键词，实时过滤标题和网站',
        url: 'https://react.dev',
        favicon: 'https://react.dev/favicon.ico',
        summary: '支持标题和域名的模糊匹配。搜索与 Tag 过滤可同时使用，取两者交集。',
        createdAt: new Date(now - 3 * day).toISOString(),
        isRead: false,
        tags: ['功能演示'],
      },
      {
        id: crypto.randomUUID(),
        title: '✅ 这是一条已读示例 — 标记已读后会变灰，可用"清除已读"批量删除',
        url: 'https://vitejs.dev',
        favicon: 'https://vitejs.dev/logo.svg',
        summary: '点击卡片右侧的 ✓ 按钮标记已读，或按键盘 R 键。已读条目会降低透明度显示在列表中。',
        createdAt: new Date(now - 4 * day).toISOString(),
        isRead: true,
        tags: [],
      },
    ];
  }

  if (isJapanese) {
    return [
      {
        id: crypto.randomUUID(),
        title: '👋 ToRead へようこそ！右上の + またはショートカットでページを追加',
        url: 'https://github.com',
        favicon: '',
        summary: 'カードの ✓ で既読、D で削除、J/K で上下移動、Enter でページを開きます。',
        createdAt: new Date(now - 1 * day).toISOString(),
        isRead: false,
        tags: ['ガイド'],
      },
      {
        id: crypto.randomUUID(),
        title: '🏷️ タグ機能：記事にタグを付けてフィルタリング',
        url: 'https://developer.chrome.com/docs/extensions',
        favicon: 'https://www.google.com/favicon.ico',
        summary: 'カードにホバーしてタグアイコンをクリックするとタグを追加できます。',
        createdAt: new Date(now - 2 * day).toISOString(),
        isRead: false,
        tags: ['デモ'],
      },
    ];
  }

  if (isKorean) {
    return [
      {
        id: crypto.randomUUID(),
        title: '👋 ToRead에 오신 것을 환영합니다! 우측 상단 + 또는 단축키로 페이지 추가',
        url: 'https://github.com',
        favicon: '',
        summary: '카드의 ✓ 로 읽음 표시, D 로 삭제, J/K 로 이동, Enter 로 페이지 열기.',
        createdAt: new Date(now - 1 * day).toISOString(),
        isRead: false,
        tags: ['가이드'],
      },
      {
        id: crypto.randomUUID(),
        title: '🏷️ 태그 기능: 기사에 태그를 달고 필터링하기',
        url: 'https://developer.chrome.com/docs/extensions',
        favicon: 'https://www.google.com/favicon.ico',
        summary: '카드에 마우스를 올리고 태그 아이콘을 클릭하면 태그를 추가할 수 있습니다.',
        createdAt: new Date(now - 2 * day).toISOString(),
        isRead: false,
        tags: ['데모'],
      },
    ];
  }

  // English (default)
  return [
    {
      id: crypto.randomUUID(),
      title: '👋 Welcome to ToRead! Click + in the top-right or use the shortcut to save pages',
      url: 'https://github.com',
      favicon: '',
      summary: 'Click ✓ to mark as read, D to delete, J/K to navigate, Enter to open. Try it now!',
      createdAt: new Date(now - 1 * day).toISOString(),
      isRead: false,
      tags: ['guide'],
    },
    {
      id: crypto.randomUUID(),
      title: '🏷️ Tags: Label articles and click a tag to filter by it',
      url: 'https://developer.chrome.com/docs/extensions',
      favicon: 'https://www.google.com/favicon.ico',
      summary: 'Hover a card and click the tag icon to add tags. Click any tag to filter. Works together with search (AND logic).',
      createdAt: new Date(now - 2 * day).toISOString(),
      isRead: false,
      tags: ['demo'],
    },
    {
      id: crypto.randomUUID(),
      title: '🔍 Search: Type in the search box to filter by title or site',
      url: 'https://react.dev',
      favicon: 'https://react.dev/favicon.ico',
      summary: 'Fuzzy match on title and domain. Combine with tag filter for precise results.',
      createdAt: new Date(now - 3 * day).toISOString(),
      isRead: false,
      tags: ['demo'],
    },
    {
      id: crypto.randomUUID(),
      title: '✅ This is a read example — marked items fade out, use "Clear read" to remove them',
      url: 'https://vitejs.dev',
      favicon: 'https://vitejs.dev/logo.svg',
      summary: 'Click ✓ or press R to mark as read. Read items stay visible but dimmed.',
      createdAt: new Date(now - 4 * day).toISOString(),
      isRead: true,
      tags: [],
    },
  ];
}

chrome.runtime.onInstalled.addListener(async (details) => {
  // 初始化 badge
  await updateBadge();

  // 首次安装时写入演示数据
  if (details.reason === 'install') {
    await seedDemoItems(buildDemoItems());
    await updateBadge();
  }

  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (
      tab.id &&
      tab.url &&
      !tab.url.startsWith('chrome://') &&
      !tab.url.startsWith('chrome-extension://') &&
      !tab.url.startsWith('about:')
    ) {
      chrome.scripting
        .executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
        .catch(() => {/* 部分页面无法注入，忽略 */});
    }
  }
});

// ---- 事件监听 ----

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'add-to-read') {
    const tab = await getActiveTab();
    if (tab) doAddCurrentPage(tab);
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'STORE_PAGE_SUMMARY') {
    const tabId = sender.tab?.id;
    console.log('[ToRead] 收到 STORE_PAGE_SUMMARY, tabId:', tabId, '摘要:', message.summary?.slice(0, 30));
    if (tabId && message.summary) {
      cacheSummary(tabId, message.summary).then(() => {
        console.log('[ToRead] 摘要已写入 session storage, tabId:', tabId);
        sendResponse({ ok: true });
      });
      return true;
    }
    return;
  }

  if (message.type === 'ADD_CURRENT_PAGE') {
    const windowId: number | undefined = message.windowId;
    (async () => {
      const tab = await getActiveTab(windowId);
      if (tab) await doAddCurrentPage(tab);
      sendResponse({ success: true });
    })();
    return true;
  }
});

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

// ---- 每日推荐：新标签页打开时推荐 1 条未读 ----

const DAILY_RECOMMEND_KEY = 'toread_last_recommend_date';

async function maybeShowDailyRecommend(): Promise<void> {
  // 检查今天是否已推荐过
  const result = await chrome.storage.local.get(DAILY_RECOMMEND_KEY);
  const lastDate: string = result[DAILY_RECOMMEND_KEY] ?? '';
  const today = new Date().toDateString();
  if (lastDate === today) return;

  const items = await getItems();
  const unread = items.filter((i) => !i.isRead);
  if (unread.length === 0) return;

  // 随机选一条未读
  const pick = unread[Math.floor(Math.random() * unread.length)];

  chrome.notifications.create(`toread_recommend_${pick.id}`, {
    type: 'basic',
    iconUrl: pick.favicon || 'icons/icon48.png',
    title: '📖 ToRead 每日推荐',
    message: pick.title,
    contextMessage: (() => {
      try { return new URL(pick.url).hostname.replace(/^www\./, ''); } catch { return ''; }
    })(),
    buttons: [{ title: '立即阅读' }],
    requireInteraction: false,
  });

  // 记录今天已推荐
  await chrome.storage.local.set({ [DAILY_RECOMMEND_KEY]: today });
}

// 点击通知按钮或通知本身时打开对应页面
chrome.notifications.onButtonClicked.addListener((notifId) => {
  if (notifId.startsWith('toread_recommend_')) {
    const itemId = notifId.replace('toread_recommend_', '');
    getItems().then((items) => {
      const item = items.find((i) => i.id === itemId);
      if (item) chrome.tabs.create({ url: item.url });
    });
  }
});

chrome.notifications.onClicked.addListener((notifId) => {
  if (notifId.startsWith('toread_recommend_')) {
    const itemId = notifId.replace('toread_recommend_', '');
    getItems().then((items) => {
      const item = items.find((i) => i.id === itemId);
      if (item) chrome.tabs.create({ url: item.url });
    });
    chrome.notifications.clear(notifId);
  }
});

// 监听新标签页创建
chrome.tabs.onCreated.addListener((tab) => {
  // 只在新标签页（newtab）时触发
  if (!tab.url || tab.url === 'chrome://newtab/' || tab.pendingUrl === 'chrome://newtab/') {
    maybeShowDailyRecommend();
  }
});
