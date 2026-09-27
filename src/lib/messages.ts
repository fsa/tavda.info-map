/**
 * Сообщения посетителей, привязанные к точкам карты.
 *
 * Записи анонимные: посетитель нигде не входит, поэтому «свои» сообщения он
 * узнаёт по идентификаторам, которые лежат у него в localStorage. Публичного
 * списка нет — GET забирает ровно то, что перечислил сам посетитель.
 *
 * Список в браузере ограничен: за раз API отдаёт не больше 100 записей,
 * поэтому и хранить больше 100 нет смысла.
 */

import axios from "axios";
import { siteApiClient, SITE_API } from "./api";

/** Сообщение в том виде, в котором его отдаёт API */
export interface MapMessage {
  id: string;
  lat: number;
  lon: number;
  text: string;
  /** Время создания в ISO 8601 */
  created_at: string;
}

/** Данные новой записи от посетителя */
export interface NewMapMessage {
  lat: number;
  lon: number;
  text: string;
  email?: string;
}

/** Ошибка, понятная посетителю: текст показать, поля подсветить */
export class MapMessageError extends Error {
  constructor(
    message: string,
    /** Сообщение по имени поля — ключи text, lat, lon, email */
    readonly fields: Record<string, string> = {},
    /** Сколько секунд ждать, если сработал лимит записи */
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "MapMessageError";
  }
}

/** Ключ, под которым посетитель хранит идентификаторы своих сообщений */
const STORAGE_KEY = "tavda:mapMessages";

/** Столько записей сервер отдаёт за один запрос — столько и держим в браузере */
const MAX_STORED = 100;

/** Не больше 1000 символов — предел проверки на сервере */
export const MAX_TEXT_LENGTH = 1000;

/** «12 марта 2026, 14:03» — подпись даты в попапе и в списке */
export function formatMessageDate(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ApiErrorBody {
  error?: string;
  errors?: Record<string, string>;
}

/** Ответ сервера превращаем в понятную посетителю ошибку */
function toMessageError(error: unknown): MapMessageError {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return new MapMessageError("Не удалось выполнить запрос.");
  }

  const response = error.response;

  if (!response) {
    return new MapMessageError("Сервер не отвечает. Проверьте соединение.");
  }

  const body = response.data ?? {};

  if (response.status === 429) {
    const retryAfter = Number(response.headers?.["retry-after"]);

    return new MapMessageError(
      body.error ?? "Слишком много сообщений, попробуйте позже.",
      {},
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    );
  }

  return new MapMessageError(
    body.error ?? `Сервер ответил кодом ${response.status}.`,
    body.errors ?? {},
  );
}

/** Идентификаторы своих сообщений из браузера (пусто, если их ещё нет) */
export function readOwnIds(): string[] {
  if (typeof localStorage === "undefined") return [];

  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((id): id is string => typeof id === "string" && "" !== id)
      .slice(0, MAX_STORED);
  } catch {
    // Испорченное значение в хранилище — считаем, что сообщений нет
    return [];
  }
}

/** Запомнить запись, чтобы потом показать её снова этому же посетителю */
export function rememberOwnId(id: string): void {
  if (typeof localStorage === "undefined") return;

  const ids = [id, ...readOwnIds().filter((known) => known !== id)];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_STORED)));
  } catch {
    // Приватный режим или переполненное хранилище: запись всё равно создана,
    // показать её второй раз не получится — молча продолжаем
  }
}

/** Забрать с сервера записи по идентификаторам (только они и придут в ответ) */
export async function loadOwnMessages(ids: string[]): Promise<MapMessage[]> {
  if (0 === ids.length) return [];

  try {
    const { data } = await siteApiClient.get<{ items: MapMessage[] }>(
      SITE_API.mapMessages,
      { params: { ids: ids.join(",") } },
    );

    return data.items ?? [];
  } catch (error) {
    throw toMessageError(error);
  }
}

/** Оставить запись о точке на карте */
export async function createMapMessage(input: NewMapMessage): Promise<MapMessage> {
  const email = input.email?.trim() ?? "";

  try {
    const { data } = await siteApiClient.post<{ message: MapMessage }>(
      SITE_API.mapMessages,
      {
        lat: input.lat,
        lon: input.lon,
        text: input.text,
        // Пустую почту не отправляем — сервер сам поймёт, что её нет
        ...("" === email ? {} : { email }),
      },
    );

    return data.message;
  } catch (error) {
    throw toMessageError(error);
  }
}
