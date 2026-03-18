/** Content script：提取页面摘要并上报给 background 缓存 */

function extractSummary(): string {
  // 优先级：og:description > meta description > 正文前 120 字
  const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content;
  if (ogDesc?.trim()) return ogDesc.trim().slice(0, 200);

  const metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content;
  if (metaDesc?.trim()) return metaDesc.trim().slice(0, 200);

  // 降级：正文提取
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
    if (!summary) return;
    chrome.runtime.sendMessage({ type: 'STORE_PAGE_SUMMARY', summary });
  } catch {
    // 扩展上下文失效时静默跳过
  }
})();
