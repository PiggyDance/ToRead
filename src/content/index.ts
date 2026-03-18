/** Content script：页面加载后提取正文前 120 字，上报给 background 缓存 */

function extractSummary(): string {
  const article = document.querySelector('article, [role="main"], main');
  const root = article ?? document.body;

  const clone = root.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll('script, style, nav, header, footer, aside, [aria-hidden="true"]')
    .forEach((el) => el.remove());

  return (clone.innerText ?? clone.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

(async () => {
  try {
    const summary = extractSummary();
    console.log('[ToRead] content script 运行，摘要长度:', summary.length, '内容:', summary.slice(0, 30));
    if (!summary) return;

    const resp = await chrome.runtime.sendMessage({ type: 'STORE_PAGE_SUMMARY', summary });
    console.log('[ToRead] STORE_PAGE_SUMMARY 响应:', resp);
  } catch (e) {
    console.log('[ToRead] content script 发送消息失败:', e);
  }
})();
