import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png?url";
import markerIcon from "leaflet/dist/images/marker-icon.png?url";
import markerShadow from "leaflet/dist/images/marker-shadow.png?url";
import { LAYERS, type LayerConfig } from "./layers";
import { geoService, type GeoState } from "./geolocation";

/** Строковый идентификатор слоя (выводится из LAYERS) */
export type MapLayer = (typeof LAYERS)[number]["id"];

/** Проверка, что строка является валидным id слоя */
function isValidLayer(id: string): id is MapLayer {
  return LAYERS.some((l) => l.id === id);
}

/** Найти конфиг слоя по id */
function getLayer(id: MapLayer): LayerConfig {
  return LAYERS.find((l) => l.id === id)!;
}

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const rawLayer = p.get("layer");
  const layer: MapLayer =
    rawLayer && isValidLayer(rawLayer) ? rawLayer : "osm";
  return {
    lat: parseFloat(p.get("lat") || "58.0419"),
    lng: parseFloat(p.get("lng") || "65.273235"),
    zoom: parseInt(p.get("zoom") || "13"),
    layer,
  };
}

function writeParams(lat: number, lng: number, zoom: number, layer: MapLayer) {
  const p = new URLSearchParams();
  p.set("lat", lat.toFixed(6));
  p.set("lng", lng.toFixed(6));
  p.set("zoom", zoom.toString());
  p.set("layer", layer);
  window.history.replaceState(null, "", `?${p.toString()}`);
}

export function initMap(containerId: string) {
  // Fix default Leaflet icons (webpack/asset bundler breaks paths)
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });

  const state = readParams();

  // Строим tileLayers динамически из LAYERS
  const tileLayers: Record<string, L.TileLayer> = {};
  for (const cfg of LAYERS) {
    tileLayers[cfg.id] = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      ...(cfg.maxZoom != null ? { maxZoom: cfg.maxZoom } : {}),
    });
  }

  const map = L.map(containerId, {
    center: [state.lat, state.lng],
    zoom: state.zoom,
    zoomControl: false,
    attributionControl: false,
  });

  tileLayers[state.layer].addTo(map);

  // URL sync
  map.on("moveend", () => {
    const c = map.getCenter();
    writeParams(c.lat, c.lng, map.getZoom(), currentLayer);
  });
  map.on("zoomend", () => {
    const c = map.getCenter();
    writeParams(c.lat, c.lng, map.getZoom(), currentLayer);
  });

  // Layer management
  let currentLayer: MapLayer = state.layer;

  function setActiveLayer(layer: MapLayer) {
    if (layer === currentLayer) return;
    map.eachLayer((l) => {
      if (l instanceof L.TileLayer) map.removeLayer(l);
    });
    tileLayers[layer].addTo(map);
    currentLayer = layer;
    const c = map.getCenter();
    writeParams(c.lat, c.lng, map.getZoom(), layer);
  }

  function getActiveLayer(): MapLayer {
    return currentLayer;
  }

  // --- User location marker ---

  /** Кастомная divIcon — синий пульсирующий кружок (когда heading отсутствует) */
  const userDotIcon = L.divIcon({
    className: "user-location-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  /** Кастомная divIcon — стрелка направления движения (GPS heading, синяя) */
  function createGpsHeadingIcon(heading: number): L.DivIcon {
    return L.divIcon({
      className: "user-location-marker user-location-heading",
      html: `<div class="user-heading-arrow" style="transform: rotate(${heading}deg)"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  /** Кастомная divIcon — стрелка компаса (зелёная, когда heading только с компаса) */
  function createCompassIcon(heading: number): L.DivIcon {
    return L.divIcon({
      className: "user-location-marker user-location-compass",
      html: `<div class="user-compass-arrow" style="transform: rotate(${heading}deg)"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  let userMarker: L.Marker | null = null;

  /** Тип текущей иконки маркера */
  type MarkerIconType = "dot" | "gps" | "compass";

  /** Определить тип иконки по heading и headingSource */
  function getMarkerIconType(heading: number | null | undefined, headingSource: string | null | undefined): MarkerIconType {
    if (heading != null && !isNaN(heading)) {
      return headingSource === "compass" ? "compass" : "gps";
    }
    return "dot";
  }

  /** Обновить или создать маркер пользователя на карте.
   *  Если передан heading (не null) — использует стрелку направления,
   *  иначе — обычный кружок.
   *  headingSource определяет цвет стрелки: gps — синяя, compass — зелёная.
   *  НЕ добавляет на карту автоматически — видимостью управляют showUserMarker/hideUserMarker. */
  function setUserMarker(lat: number, lng: number, heading?: number | null, headingSource?: string | null) {
    const iconType = getMarkerIconType(heading, headingSource);
    let newIcon: L.DivIcon;
    switch (iconType) {
      case "gps":
        newIcon = createGpsHeadingIcon(heading!);
        break;
      case "compass":
        newIcon = createCompassIcon(heading!);
        break;
      default:
        newIcon = userDotIcon;
    }

    if (userMarker) {
      userMarker.setLatLng([lat, lng]);
      // Меняем иконку только если изменился тип
      const currentType = getCurrentMarkerIconType();
      if (iconType !== currentType) {
        userMarker.setIcon(newIcon);
      }
    } else {
      userMarker = L.marker([lat, lng], { icon: newIcon, zIndexOffset: 10000 });
    }
  }

  /** Определить тип текущей иконки на маркере */
  function getCurrentMarkerIconType(): MarkerIconType {
    if (!userMarker) return "dot";
    const className = userMarker.getIcon().options.className || "";
    if (className.includes("user-location-compass")) return "compass";
    if (className.includes("user-location-heading")) return "gps";
    return "dot";
  }

  /** Показать маркер (если есть координаты) */
  function showUserMarker() {
    if (userMarker) {
      userMarker.addTo(map);
    }
  }

  /** Скрыть маркер с карты */
  function hideUserMarker() {
    if (userMarker) {
      map.removeLayer(userMarker);
    }
  }

  /** Проверить, виден ли маркер на карте */
  function isUserMarkerVisible(): boolean {
    if (!userMarker) return false;
    return map.hasLayer(userMarker);
  }

  // --- Подписка на сервис геолокации ---

  /** Обработчик изменений состояния геолокации */
  function onGeoState(s: GeoState) {
    if (s.position) {
      setUserMarker(s.position.lat, s.position.lng, s.position.heading, s.headingSource);
    }
    if (s.showMarker) {
      showUserMarker();
    } else {
      hideUserMarker();
    }
    // Режим следования — двигаем карту за пользователем
    if (s.followMode && s.position) {
      map.flyTo([s.position.lat, s.position.lng], map.getZoom(), { duration: 0.5 });
    } else if (s.position && s.pendingCenter) {
      // Однократное перемещение к позиции — только при явном запросе "Найти меня",
      // а не при фоновом определении местоположения на загрузке страницы.
      map.flyTo([s.position.lat, s.position.lng], Math.max(map.getZoom(), 15), { duration: 1 });
      geoService.clearPendingCenter();
    }
  }

  // Подписываемся на изменения
  geoService.on(onGeoState);
  // Применяем текущее состояние (on() больше не вызывает listener синхронно)
  onGeoState(geoService.getState());

  // Ручное перемещение карты отключает режим слежения полностью,
  // чтобы кнопка и индикатор показывали реальное состояние
  map.on("dragstart", () => {
    geoService.setTracking(false);
  });

  // Zoom + locate controls
  const zoomControl = new L.Control({ position: "bottomright" });
  zoomControl.onAdd = () => {
    const div = L.DomUtil.create("div", "zoom-controls");
    const locateBtn = L.DomUtil.create("button", "zoom-button", div);
    locateBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18"><path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>';
    locateBtn.title = "Найти меня";
    locateBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      geoService.locate();
    });
    const homeBtn = L.DomUtil.create("button", "zoom-button", div);
    homeBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18"><path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 21V12h6v9"/></svg>';
    homeBtn.title = "Показать Тавду";
    homeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      flyToTavda();
    });
    const zoomIn = L.DomUtil.create("button", "zoom-button", div);
    zoomIn.textContent = "+";
    zoomIn.addEventListener("click", (e) => {
      e.stopPropagation();
      map.zoomIn();
    });
    const zoomOut = L.DomUtil.create("button", "zoom-button", div);
    zoomOut.textContent = "−";
    zoomOut.addEventListener("click", (e) => {
      e.stopPropagation();
      map.zoomOut();
    });
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  zoomControl.addTo(map);

  function flyToTavda() {
    map.flyTo([58.0419, 65.273235], 13, { duration: 1.5 });
  }

  // --- Результаты поиска ---

  const escapeHtml = (s: string): string =>
    s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  /** Слой с отображаемыми объектами из GeoJSON */
  const featureLayer = L.layerGroup().addTo(map);

  /** Иконка остановки ОТ — голубая круглая метка с автобусом */
  const stopIcon = L.divIcon({
    className: "route-stop-marker",
    html: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 11V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4a1 1 0 0 1 1 1v3h-1v1a2 2 0 0 1-2 2v1h-2v-1H8v1H6v-1a2 2 0 0 1-2-2v-1H3v-3a1 1 0 0 1 1-1Zm2 0h12V7a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4Zm1.5 5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm11 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"/></svg>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  /** Первая точка GeoJSON-геометрии любого типа → LatLng */
  function firstLatLng(geometry: GeoJSON.GeometryObject): L.LatLng | null {
    const c = (geometry as unknown as { coordinates?: unknown }).coordinates as any;
    let pos: unknown;
    switch (geometry.type) {
      case "Point":
        pos = c;
        break;
      case "LineString":
      case "MultiPoint":
        pos = Array.isArray(c) ? c[0] : undefined;
        break;
      case "MultiLineString":
      case "Polygon":
        pos = Array.isArray(c) ? c[0]?.[0] : undefined;
        break;
      case "MultiPolygon":
        pos = Array.isArray(c) ? c[0]?.[0]?.[0] : undefined;
        break;
      default:
        pos = undefined;
    }
    if (!Array.isArray(pos) || typeof pos[0] !== "number") return null;
    return L.latLng(pos[1], pos[0]);
  }

  /** Показать найденный объект на карте по его GeoJSON-геометрии */
  function showFeature(
    geometry: GeoJSON.GeometryObject | null,
    name?: string,
    addr?: string | null,
    stops?: { name: string | null; geometry: GeoJSON.GeometryObject | null }[],
  ) {
    featureLayer.clearLayers();
    if (!geometry) return;

    const popupContent = `<strong>${escapeHtml(name ?? "")}</strong>` +
      (addr ? `<br>${escapeHtml(addr)}` : "");

    const layer = L.geoJSON(geometry);
    layer.addTo(featureLayer);

    // Остановки маршрута — маркеры с отдельной иконкой
    let anchor: L.LatLng | null = null;
    (stops ?? []).forEach((s) => {
      if (!s.geometry) return;
      const latlng = firstLatLng(s.geometry);
      if (!latlng) return;
      if (!anchor) anchor = latlng;
      const marker = L.marker(latlng, { icon: stopIcon });
      if (s.name) {
        marker.bindPopup(`<strong>${escapeHtml(s.name)}</strong>`);
      }
      marker.addTo(featureLayer);
    });

    const bounds = featureLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
    }

    // Попап открываем в реальной точке на объекте (первая остановка / первая точка),
    // а не в центре границ — у протяжённых маршрутов центр может быть «в никуда»
    const openAt = anchor ?? firstLatLng(geometry) ?? bounds.getCenter();
    if (popupContent.trim()) {
      map.openPopup(popupContent, openAt);
    }
  }

  return {
    map,
    setActiveLayer,
    getActiveLayer,
    flyToTavda,
    showFeature,
    showUserMarker,
    hideUserMarker,
    isUserMarkerVisible,
  };
}

export type MapInstance = ReturnType<typeof initMap>;
