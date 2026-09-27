import { useEffect, useState } from "react";
import type { MapInstance } from "../lib/map";
import { MapMessageError, MAX_TEXT_LENGTH, type NewMapMessage } from "../lib/messages";
import { geoService } from "../lib/geolocation";

interface Props {
  /** Карта, на которой стоит метка выбора точки */
  map: MapInstance;
  /** Отправить запись; бросает MapMessageError, если сервер её не принял */
  onSubmit: (message: NewMapMessage) => Promise<void>;
  /** Закрыть форму (успех или отмена) */
  onClose: () => void;
}

/**
 * Форма сообщения о точке на карте.
 *
 * Точка выбирается на карте: метка появляется на текущей геопозиции
 * посетителя (или в центре карты, если геолокация недоступна) и её можно
 * перетащить или передвинуть кликом по карте.
 */
export default function MessageComposer({ map, onSubmit, onClose }: Props) {
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [point, setPoint] = useState(() => {
    // Точка, на которой открыли форму
    const position = geoService.getState().position;
    return position
      ? { lat: position.lat, lon: position.lng }
      : map.getCenter();
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Пока форма открыта, карта в режиме выбора точки; закрыли — убрали метку
  useEffect(() => {
    map.startPlacing(point.lat, point.lon, setPoint);

    return () => map.stopPlacing();
    // Точка меняется только через карту, а не через этот эффект
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (sending) return;

    const trimmed = text.trim();

    if ("" === trimmed) {
      setFieldErrors({ text: "Напишите, что находится в этом месте." });
      setError(null);

      return;
    }

    setSending(true);
    setError(null);
    setFieldErrors({});

    try {
      await onSubmit({ lat: point.lat, lon: point.lon, text: trimmed, email });
    } catch (caught) {
      if (caught instanceof MapMessageError) {
        setError(caught.message);
        setFieldErrors(caught.fields);
      } else {
        setError("Не удалось отправить сообщение.");
      }
      setSending(false);
    }
  };

  /** Вернуть метку к текущему местоположению посетителя */
  const recenter = () => {
    const position = geoService.getState().position;

    if (!position) return;

    map.map.flyTo([position.lat, position.lng], Math.max(map.map.getZoom(), 16), { duration: 0.6 });
    setPoint({ lat: position.lat, lon: position.lng });
  };

  return (
    <div className="composer" role="dialog" aria-label="Сообщение о месте на карте">
      <div className="composer-header">
        <span className="composer-title">Сообщение о месте</span>
        <button
          type="button"
          className="composer-close"
          onClick={onClose}
          aria-label="Закрыть форму"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="composer-hint">
        Перетащите метку или кликните по карте, чтобы указать точку.
      </p>

      <form onSubmit={submit} className="composer-form">
        <div className="composer-field">
          <textarea
            className="composer-text"
            value={text}
            maxLength={MAX_TEXT_LENGTH}
            rows={4}
            placeholder="Что здесь происходит? Например: яма на дороге, сломанный фонарь"
            onChange={(e) => setText(e.target.value)}
          />
          <span className="composer-counter" aria-hidden="true">
            {text.length}/{MAX_TEXT_LENGTH}
          </span>
          {fieldErrors.text && <span className="composer-field-error">{fieldErrors.text}</span>}
        </div>

        <label className="composer-field">
          <span className="composer-label">Почта для ответа (необязательно)</span>
          <input
            type="email"
            className="composer-input"
            value={email}
            placeholder="ivan@example.ru"
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
          {fieldErrors.email && <span className="composer-field-error">{fieldErrors.email}</span>}
        </label>

        {error && <p className="composer-error">{error}</p>}

        <div className="composer-actions">
          <button
            type="button"
            className="composer-btn composer-btn-ghost"
            onClick={recenter}
            title="Перенести метку туда, где вы находитесь"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
              <path
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z"
              />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <span>Я здесь</span>
          </button>

          <button
            type="button"
            className="composer-btn composer-btn-ghost"
            onClick={onClose}
            disabled={sending}
          >
            Отмена
          </button>

          <button
            type="submit"
            className="composer-btn composer-btn-primary"
            disabled={sending}
          >
            {sending ? "Отправляем…" : "Отправить"}
          </button>
        </div>
      </form>
    </div>
  );
}

