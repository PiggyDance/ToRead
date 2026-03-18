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
  const m = (key: string) => chrome.i18n.getMessage(key);

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  return [
    {
      id: crypto.randomUUID(),
      title: m('demoItem1Title'),
      url: 'https://github.com',
      favicon: '',
      summary: m('demoItem1Summary'),
      createdAt: new Date(now - 1 * day).toISOString(),
      isRead: false,
      tags: [m('demoItem1Tag')],
    },
    {
      id: crypto.randomUUID(),
      title: m('demoItem2Title'),
      url: 'https://developer.chrome.com/docs/extensions',
      favicon: 'https://www.google.com/favicon.ico',
      summary: m('demoItem2Summary'),
      createdAt: new Date(now - 2 * day).toISOString(),
      isRead: false,
      tags: [m('demoItem2Tag')],
    },
    {
      id: crypto.randomUUID(),
      title: m('demoItem3Title'),
      url: 'https://react.dev',
      favicon: 'https://react.dev/favicon.ico',
      summary: m('demoItem3Summary'),
      createdAt: new Date(now - 3 * day).toISOString(),
      isRead: false,
      tags: [m('demoItem3Tag')],
    },
    {
      id: crypto.randomUUID(),
      title: m('demoItem4Title'),
      url: 'https://vitejs.dev',
      favicon: 'https://vitejs.dev/logo.svg',
      summary: m('demoItem4Summary'),
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
    title: chrome.i18n.getMessage('dailyRecommendTitle'),
    message: pick.title,
    contextMessage: (() => {
      try { return new URL(pick.url).hostname.replace(/^www\./, ''); } catch { return ''; }
    })(),
    buttons: [{ title: chrome.i18n.getMessage('dailyRecommendButton') }],
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
