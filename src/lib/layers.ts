/**
 * Централизованное хранилище слоёв карты.
 *
 * Чтобы добавить новый слой — просто добавьте объект в массив LAYERS.
 * Все поля обязательны.
 *
 * Поля:
 *   id        — уникальный идентификатор (используется в URL и как ключ)
 *   name      — название для отображения в боковом меню
 *   url       — URL тайлового сервера (шаблон Leaflet: {z}/{x}/{y})
 *   attribution — подпись attribution (HTML)
 *   maxZoom   — максимальный зум (необязательно, по умолчанию 19)
 */

export interface LayerConfig {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom?: number;
}

export const LAYERS: LayerConfig[] = [
  {
    id: "osm",
    name: "© OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
  {
    id: "transport",
    name: "Транспорт (© Thunderforest)",
    url: "https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=e426aa11f4764b36b140f271cd2c19e0",
    attribution: "&copy; Thunderforest",
  },
  {
    id: "arcgis",
    name: "Спутник (ArcGIS)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
  },
  {
    id: "opentopomap",
    name: "OpenTopoMap",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
    maxZoom: 17,
  },
  {
    id: "cyclosm",
    name: "CyclOSM",
    url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors & <a href="https://cyclosm.org">CyclOSM</a>',
  },
  {
    id: "hot",
    name: "Humanitarian (HOT)",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://www.hotosm.org/">HOT</a>',
  },
];