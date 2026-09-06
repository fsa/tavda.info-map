/**
 * Сервис поиска.
 *
 * Отправляет POST-запрос на API с координатами пользователя и текстовым запросом.
 * Бекенд возвращает массив найденных мест (Place).
 */

import { apiClient } from "./api";

/** Одно найденное место */
export interface SearchPlace {
  id: number;
  name: string;
  addr: string | null;
  coords: { lat: number; lon: number } | null;
}

export interface SearchResult {
  /** Найденные места (пусто при ошибке или отсутствии результатов) */
  places: SearchPlace[];
  /** Сообщение для отображения пользователю (null при успешном результате) */
  message: string | null;
  /** Тип сообщения: успех / информация / ошибка */
  type: "success" | "info" | "error";
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
 * @returns SearchResult со списком мест и сообщением для пользователя
 */
export async function search(payload: SearchPayload): Promise<SearchResult> {
  try {
    const response = await apiClient.post<SearchPlace[]>("", payload);
    const places = Array.isArray(response.data) ? response.data : [];

    if (places.length === 0) {
      return {
        places: [],
        message: "Ничего не найдено",
        type: "info",
      };
    }

    return {
      places,
      message: null,
      type: "success",
    };
  } catch (error) {
    return {
      places: [],
      message: "Поиск временно недоступен",
      type: "error",
    };
  }
}