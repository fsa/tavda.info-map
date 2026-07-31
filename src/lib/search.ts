/**
 * Сервис поиска.
 *
 * Отправляет POST-запрос на API с координатами пользователя и текстовым запросом.
 * Обрабатывает ответы:
 *   - 200 → ответ получен, но сервис ещё не готов
 *   - любой другой ответ / сетевая ошибка → сервис на этапе разработки
 */

import { apiClient } from "./api";

export interface SearchResult {
  /** Сообщение для отображения пользователю */
  message: string;
  /** Тип сообщения: успех / ошибка */
  type: "info" | "error";
}

export interface SearchPayload {
  query: string;
  lat: number;
  lng: number;
}

/**
 * Выполнить поиск.
 *
 * @param payload - объект с текстом запроса и координатами
 * @returns SearchResult с сообщением для пользователя
 */
export async function search(payload: SearchPayload): Promise<SearchResult> {
  try {
    const response = await apiClient.post("", payload);

    if (response.status === 200) {
      return {
        message: "Ответ получен, но сервис ещё не готов",
        type: "info",
      };
    }

    return {
      message: "Сервис на этапе разработки",
      type: "info",
    };
  } catch {
    return {
      message: "Сервис на этапе разработки",
      type: "info",
    };
  }
}