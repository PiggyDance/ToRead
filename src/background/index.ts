import { addItem } from '../storage';

/** 添加当前活跃页面到待阅读列表 */
async function addCurrentPage(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url || !tab.title) {
    console.warn('[ToRead] 无法获取当前页面信息');
    return;
  }

  // 过滤 chrome:// 等内部页面
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    console.warn('[ToRead] 不支持添加浏览器内部页面');
    return;
  }

  const result = await addItem({
    title: tab.title,
    url: tab.url,
    favicon: tab.favIconUrl,
  });

  if (result.added) {
    // 显示 badge 反馈
    await chrome.action.setBadgeText({ text: '✓', tabId: tab.id });
    await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: tab.id });
    setTimeout(() => {
      if (tab.id) {
        chrome.action.setBadgeText({ text: '', tabId: tab.id });
      }
    }, 2000);
  } else {
    await chrome.action.setBadgeText({ text: '…', tabId: tab.id });
    await chrome.action.setBadgeBackgroundColor({ color: '#FF9800', tabId: tab.id });
    setTimeout(() => {
      if (tab.id) {
        chrome.action.setBadgeText({ text: '', tabId: tab.id });
      }
    }, 2000);
  }
}

// 监听快捷键命令
chrome.commands.onCommand.addListener((command) => {
  if (command === 'add-to-read') {
    addCurrentPage();
  }
});

// 点击扩展图标时打开侧边栏
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// 监听来自 SidePanel 的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ADD_CURRENT_PAGE') {
    addCurrentPage().then(() => sendResponse({ success: true }));
    return true; // 异步 sendResponse
  }
});

// 设置侧边栏行为：点击图标时打开
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);
