/**
 * 薄封装 chrome.i18n.getMessage，提供类型安全的翻译访问。
 * 所有翻译字符串均存储在 public/_locales/{locale}/messages.json 中，
 * 由 Chrome 扩展 i18n API 根据浏览器语言自动选择。
 */

/** 获取无占位符的翻译字符串 */
function msg(key: string): string {
  return chrome.i18n.getMessage(key);
}

/** 获取带数字占位符的翻译字符串 */
function msgN(key: string, n: number): string {
  return chrome.i18n.getMessage(key, [String(n)]);
}

export const t = {
  get appSlogan()          { return msg('appSlogan'); },
  get emptyTitle()         { return msg('emptyTitle'); },
  get emptyTitleFiltered() { return msg('emptyTitleFiltered'); },
  get emptyHintFiltered()  { return msg('emptyHintFiltered'); },
  get clearRead()          { return msg('clearRead'); },
  get addCurrentPage()     { return msg('addCurrentPage'); },
  get filterAll()          { return msg('filterAll'); },
  get filterUnread()       { return msg('filterUnread'); },
  get filterRead()         { return msg('filterRead'); },
  get shortcutPrefix()     { return msg('shortcutPrefix'); },
  get shortcutSuffix()     { return msg('shortcutSuffix'); },
  get markAsRead()         { return msg('markAsRead'); },
  get markAsUnread()       { return msg('markAsUnread'); },
  get remove()             { return msg('remove'); },
  get timeJustNow()        { return msg('timeJustNow'); },
  get summaryGenerating()  { return msg('summaryGenerating'); },
  get searchPlaceholder()  { return msg('searchPlaceholder'); },
  get emptyTitleSearch()   { return msg('emptyTitleSearch'); },
  get emptyHintSearch()    { return msg('emptyHintSearch'); },

  timeMinutesAgo: (n: number) => msgN('timeMinutesAgo', n),
  timeHoursAgo:   (n: number) => msgN('timeHoursAgo', n),
  timeDaysAgo:    (n: number) => msgN('timeDaysAgo', n),
};
