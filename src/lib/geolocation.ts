import { toast } from "./toast";

const STORAGE_KEY_SHOW_MARKER = "tavda:showUserMarker";

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
  /** Высота над уровнем моря в метрах (null, если недоступно) */
  altitude: number | null;
  /** Точность высоты в метрах (null, если недоступно) */
  altitudeAccuracy: number | null;
  /** Направление движения в градусах по часовой стрелке от севера (null, если недоступно) */
  heading: number | null;
  /** Скорость движения в км/ч (null, если недоступно). Исходные м/с конвертируются * 3.6 */
  speed: number | null;
}

export interface GeoState {
  /** Показывать ли маркер на карте */
  showMarker: boolean;
  /** Активно ли постоянное отслеживание (watchPosition) */
  tracking: boolean;
  /** Режим следования (карта движется за пользователем) */
  followMode: boolean;
  /** Текущие координаты (null, если ещё не получены) */
  position: GeoPosition | null;
}

type Listener = (state: GeoState) => void;

class GeolocationService {
  private state: GeoState;
  private watchId: number | null = null;
  private listeners: Set<Listener> = new Set();

  constructor() {
    const stored = typeof localStorage !== "undefined"
      ? localStorage.getItem(STORAGE_KEY_SHOW_MARKER) === "true"
      : false;

    this.state = {
      showMarker: stored,
      tracking: false,
      followMode: false,
      position: null,
    };
  }

  // --- Подписка на изменения состояния ---

  /** Подписаться на изменения состояния */
  on(listener: Listener): () => void {
    this.listeners.add(listener);
    // Немедленно уведомляем с текущим состоянием
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  /** Отписаться */
  off(listener: Listener): void {
    this.listeners.delete(listener);
  }

  private emit() {
    for (const fn of this.listeners) {
      fn({ ...this.state });
    }
  }

  // --- Публичное API ---

  /** Получить текущее состояние */
  getState(): GeoState {
    return { ...this.state };
  }

  /** Показать/скрыть маркер */
  setShowMarker(visible: boolean): void {
    this.state.showMarker = visible;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_SHOW_MARKER, String(visible));
    }
    // Если скрываем маркер — отключаем трекинг
    if (!visible && this.state.tracking) {
      this.stopWatching();
    }
    this.emit();
  }

  /** Включить/выключить постоянное отслеживание */
  setTracking(enabled: boolean): void {
    if (enabled) {
      this.startWatching();
    } else {
      this.stopWatching();
    }
  }

  /** Запросить местоположение (однократно) */
  locate(): void {
    if (!navigator.geolocation) {
      toast.error("Геолокация не поддерживается вашим браузером");
      return;
    }

    // Сразу включаем маркер, не дожидаясь ответа
    this.state.showMarker = true;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_SHOW_MARKER, "true");
    }
    this.emit();

    toast.loading("Поиск местоположения…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed: speedMs } = pos.coords;
        this.state.position = {
          lat: latitude,
          lng: longitude,
          accuracy,
          altitude,
          altitudeAccuracy,
          heading,
          speed: speedMs !== null && speedMs !== undefined ? +(speedMs * 3.6).toFixed(1) : null,
        };
        this.emit();

        toast.dismissAll();
        if (this.state.tracking) {
          // Отслеживание активно — включаем режим следования
          this.state.followMode = true;
          this.emit();
          toast.success("Слежение активно, карта следует за вами");
        } else if (accuracy <= 50) {
          toast.success(`Вы найдены: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } else if (accuracy <= 500) {
          toast.info(`Местоположение определено по сети (точность ${accuracy.toFixed(0)} м)`);
        } else {
          toast.info(`Местоположение определено приблизительно (точность ${accuracy.toFixed(0)} м)`);
        }
      },
      (err) => {
        toast.dismissAll();
        switch (err.code) {
          case err.PERMISSION_DENIED:
            toast.error("Доступ к геолокации запрещён");
            break;
          case err.POSITION_UNAVAILABLE:
            toast.error("Не удалось определить местоположение");
            break;
          case err.TIMEOUT:
            toast.error("Время ожидания геолокации истекло");
            break;
          default:
            toast.error("Ошибка геолокации");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  /** Отключить режим следования */
  disableFollow(): void {
    if (this.state.followMode) {
      this.state.followMode = false;
      this.emit();
    }
  }

  // --- Приватные методы ---

  private startWatching(): void {
    if (!navigator.geolocation) {
      toast.error("Геолокация не поддерживается вашим браузером");
      return;
    }
    if (this.watchId !== null) return;

    this.state.tracking = true;
    this.emit();

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed: speedMs } = pos.coords;
        this.state.position = {
          lat: latitude,
          lng: longitude,
          accuracy,
          altitude,
          altitudeAccuracy,
          heading,
          speed: speedMs !== null && speedMs !== undefined ? +(speedMs * 3.6).toFixed(1) : null,
        };
        this.emit();
      },
      (err) => {
        console.warn("watchPosition error:", err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }

  private stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.state.tracking = false;
    this.state.followMode = false;
    this.emit();
  }
}

/** Единственный экземпляр сервиса геолокации */
export const geoService = new GeolocationService();