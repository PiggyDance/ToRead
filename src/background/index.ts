import { addItem, updateSummary } from '../storage';

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

  const badgeText = result.added ? '✓' : '…';
  const badgeColor = result.added ? '#4CAF50' : '#FF9800';
  await chrome.action.setBadgeText({ text: badgeText, tabId: tab.id });
  await chrome.action.setBadgeBackgroundColor({ color: badgeColor, tabId: tab.id });
  setTimeout(() => {
    if (tab.id) chrome.action.setBadgeText({ text: '', tabId: tab.id });
  }, 2000);

  if (result.added && result.item) {
    const summary = await getCachedSummary(tab.id);
    console.log('[ToRead] 读取摘要缓存 tabId:', tab.id, '→', summary.slice(0, 30) || '(空)');
    if (summary) {
      await updateSummary(result.item.id, summary);
    }
  }
}

// ---- 扩展安装/更新时，向所有已打开的网页 tab 注入 content script ----

chrome.runtime.onInstalled.addListener(async () => {
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
