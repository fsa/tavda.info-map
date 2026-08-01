import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { LAYERS, type LayerConfig } from "./layers";
import { geoService } from "./geolocation";

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

  /** Кастомная divIcon — синий пульсирующий кружок */
  const userIcon = L.divIcon({
    className: "user-location-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  let userMarker: L.Marker | null = null;

  /** Обновить или создать маркер пользователя на карте */
  function setUserMarker(lat: number, lng: number) {
    if (userMarker) {
      userMarker.setLatLng([lat, lng]);
    } else {
      userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 10000 }).addTo(map);
    }
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

  // При изменении состояния — показываем/скрываем маркер, двигаем карту
  geoService.on((s) => {
    if (s.position) {
      setUserMarker(s.position.lat, s.position.lng);
    }
    if (s.showMarker && s.position) {
      showUserMarker();
    } else if (!s.showMarker) {
      hideUserMarker();
    }
    // Режим следования — двигаем карту за пользователем
    if (s.followMode && s.position) {
      map.flyTo([s.position.lat, s.position.lng], map.getZoom(), { duration: 0.5 });
    }
  });

  // Отключаем follow при ручном перемещении карты
  map.on("dragstart", () => {
    geoService.disableFollow();
  });

  // Zoom + locate controls
  const zoomControl = L.control({ position: "bottomright" });
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

  return {
    map,
    setActiveLayer,
    getActiveLayer,
    flyToTavda,
    showUserMarker,
    hideUserMarker,
    isUserMarkerVisible,
  };
}

export type MapInstance = ReturnType<typeof initMap>;
