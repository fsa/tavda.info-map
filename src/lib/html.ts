/**
 * Подстановка текста в HTML.
 *
 * Всё, что пришло с сервера или от посетителя и попадает в innerHTML
 * (подписи попапов, текст сообщений на карте), обязано пройти через
 * escapeHtml: иначе чужой текст станет разметкой.
 */

export const escapeHtml = (s: string): string =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
