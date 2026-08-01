/**
 * Простой сервис для показа всплывающих уведомлений (toast).
 *
 * Использование:
 *   import { toast } from "./toast";
 *   toast.success("Готово");
 *   toast.error("Что-то пошло не так");
 */

const CONTAINER_ID = "toast-container";

function getContainer(): HTMLElement {
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = CONTAINER_ID;
    el.className = "toast-container";
    document.body.appendChild(el);
  }
  return el;
}

function show(message: string, type: "success" | "error" | "info" | "loading", duration = 4000) {
  const container = getContainer();

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Анимация появления
  requestAnimationFrame(() => {
    toast.classList.add("toast-visible");
  });

  // Авто-скрытие
  if (duration > 0) {
    setTimeout(() => {
      toast.classList.remove("toast-visible");
      toast.addEventListener("transitionend", () => {
        toast.remove();
      });
    }, duration);
  }
}

/** Скрыть все активные уведомления */
function dismissAll() {
  const container = getContainer();
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

export const toast = {
  success: (msg: string) => show(msg, "success"),
  error: (msg: string) => show(msg, "error"),
  info: (msg: string) => show(msg, "info"),
  loading: (msg: string) => {
    dismissAll();
    show(msg, "loading", 0);
  },
  dismissAll,
};