/**
 * Слой сообщений посетителей на карте и метка выбора точки.
 *
 * Сообщения показываются только те, что посетитель оставил сам: их
 * идентификаторы лежат в localStorage, а карта получает готовый список из
 * React-компонента (см. messages.ts). Никакого публичного «всех сообщений»
 * здесь нет и быть не может — API так не отдаёт.
 *
 * Отдельно живёт метка постановки: пока посетитель пишет текст, он может
 * перетащить её или ткнуть в карту — это меняет точку будущей записи.
 */

import L from "leaflet";
import { DRAFT_SVG, MESSAGE_SVG } from "./icons";
import { escapeHtml } from "./html";
import { formatMessageDate, type MapMessage } from "./messages";

/** Точка на карте */
export interface MessagePoint {
  lat: number;
  lon: number;
}

/** Клик по маркеру своего сообщения */
export type MessageSelectHandler = (id: string) => void;

const iconCache = new Map<string, L.DivIcon>();

/** Иконка маркера сообщения (обычная и выбранная) */
function messageIcon(selected: boolean): L.DivIcon {
  const key = selected ? "message-selected" : "message";
  const cached = iconCache.get(key);
  if (cached) return cached;

  const icon = L.divIcon({
    className: selected ? "message-marker message-marker-selected" : "message-marker",
    html: MESSAGE_SVG,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
  iconCache.set(key, icon);
  return icon;
}

export interface MessageLayer {
  /** Заменить набор своих сообщений на карте */
  setMessages(list: MapMessage[]): void;
  /** Подсветить выбранное сообщение и открыть его попап */
  setSelected(id: string | null): void;
  /** Кто отвечает за клик по маркеру (обычно React) */
  setSelectHandler(handler: MessageSelectHandler | null): void;
}

export function createMessageLayer(map: L.Map): MessageLayer {
  /** Слой Leaflet с маркерами сообщений */
  const group = L.layerGroup().addTo(map);
  let messages: MapMessage[] = [];
  let selectedId: string | null = null;
  let onSelect: MessageSelectHandler | null = null;

  /** Текст записей отличается только содержимым, поэтому попап строим заново */
  function popupHtml(message: MapMessage): string {
    return (
      `<div class="message-popup">` +
      `<div class="message-popup-text">${escapeHtml(message.text)}</div>` +
      `<div class="message-popup-date">${escapeHtml(formatMessageDate(message.created_at))}</div>` +
      `</div>`
    );
  }

  function render(): void {
    group.clearLayers();

    for (const message of messages) {
      const marker = L.marker([message.lat, message.lon], {
        icon: messageIcon(message.id === selectedId),
        zIndexOffset: 500,
      });
      marker.bindPopup(popupHtml(message), { closeButton: true, maxWidth: 280 });
      marker.on("click", () => onSelect?.(message.id));
      marker.addTo(group);
    }

    if (selectedId) {
      const selected = messages.find((message) => message.id === selectedId);
      if (selected) {
        map.openPopup(popupHtml(selected), [selected.lat, selected.lon]);
      }
    }
  }

  return {
    setMessages(list) {
      // Записи, которых сервер не вернул (нет в базе), на карте не рисуем
      messages = list;
      render();
    },
    setSelected(id) {
      if (id === selectedId) return;
      selectedId = id;
      render();
    },
    setSelectHandler(handler) {
      onSelect = handler;
    },
  };
}

/** Метка, которую посетитель ставит и двигает, выбирая точку записи */
export interface DraftController {
  /** Показать метку и включить режим выбора точки на карте */
  start(lat: number, lon: number, onMove: (point: MessagePoint) => void): void;
  /** Убрать метку и вернуть карту в обычный режим */
  stop(): void;
  /** Текущая точка метки (null, если режим выключен) */
  getPosition(): MessagePoint | null;
  /** Активен ли сейчас режим выбора точки */
  isActive(): boolean;
}

export function createDraftController(map: L.Map): DraftController {
  let marker: L.Marker | null = null;
  let onMove: ((point: MessagePoint) => void) | null = null;

  const icon = L.divIcon({
    className: "message-draft-marker",
    html: DRAFT_SVG,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  /** Точка → пара координат Leaflet */
  function toLatLng(point: MessagePoint): L.LatLng {
    return L.latLng(point.lat, point.lon);
  }

  /** Точка метки → объект для React-состояния */
  function toPoint(latlng: L.LatLng): MessagePoint {
    return { lat: latlng.lat, lon: latlng.lng };
  }

  /** Переместить метку (с пересчётом точки для формы) */
  function moveTo(point: MessagePoint): void {
    if (!marker) return;
    marker.setLatLng(toLatLng(point));
    onMove?.(toPoint(marker.getLatLng()));
  }

  // Клик по карте двигает метку, но только пока режим включён
  function onMapClick(e: L.LeafletMouseEvent): void {
    moveTo(toPoint(e.latlng));
  }

  function start(lat: number, lon: number, handler: (point: MessagePoint) => void): void {
    stop();
    onMove = handler;
    marker = L.marker(toLatLng({ lat, lon }), {
      icon,
      draggable: true,
      zIndexOffset: 9000,
    });
    marker.on("dragend", () => {
      if (marker) onMove?.(toPoint(marker.getLatLng()));
    });
    marker.addTo(map);
    map.getContainer().classList.add("map-placing");
    map.on("click", onMapClick);
  }

  function stop(): void {
    map.off("click", onMapClick);
    map.getContainer().classList.remove("map-placing");
    if (marker) {
      map.removeLayer(marker);
      marker = null;
    }
    onMove = null;
  }

  return {
    start,
    stop,
    getPosition: () => (marker ? toPoint(marker.getLatLng()) : null),
    isActive: () => marker !== null,
  };
}
