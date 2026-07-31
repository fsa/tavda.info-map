/**
 * Базовый API-клиент на axios.
 *
 * Предоставляет единую точку входа для всех HTTP-запросов к бекенду.
 * В будущем здесь можно добавить:
 *   - интерцепторы для авторизации (JWT-токен)
 *   - автоматическую рефрешь токена
 *   - глобальную обработку ошибок
 *   - логирование запросов
 */

import axios from "axios";

/** Базовый URL из переменной окружения (Astro делает PUBLIC_* доступными на клиенте) */
const BASE_URL = import.meta.env.PUBLIC_API_URL as string;

if (!BASE_URL) {
  throw new Error(
    "PUBLIC_API_URL не задан. Добавьте PUBLIC_API_URL в .env файл.",
  );
}

/** Инстанс axios с предварительно настроенным baseURL */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Точка расширения: интерцепторы ---

// Пример интерцептора для авторизации (раскомментировать при необходимости):
// apiClient.interceptors.request.use((config) => {
//   const token = localStorage.getItem("auth_token");
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// Пример интерцептора для глобальной обработки ошибок:
// apiClient.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     // Логирование или показ уведомлений
//     return Promise.reject(error);
//   },
// );