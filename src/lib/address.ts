/**
 * Адрес объекта одной строкой.
 *
 * API отдаёт адрес тремя отдельными полями (`settlement`, `street`,
 * `housenumber`) — как у зданий, так и у точек интереса и остановок.
 * Здесь они собираются в строку «Тавда, улица Ленина, 48».
 *
 * Если нет ни улицы, ни номера, адрес не показывается: один населённый
 * пункт без улицы полезнее заменить категорией объекта (`category_label`).
 */

/** Поля адреса в ответах API */
export interface AddressParts {
  settlement?: string | null;
  street?: string | null;
  housenumber?: string | null;
}

/**
 * Собрать адрес в строку.
 *
 * @param parts - поля адреса из ответа API
 * @returns «НП, улица, номер» либо null, если нет улицы и номера
 */
export function streetAddress(parts: AddressParts): string | null {
  if (!parts.street && !parts.housenumber) return null;
  return [parts.settlement, parts.street, parts.housenumber]
    .filter((part): part is string => Boolean(part))
    .join(", ");
}
