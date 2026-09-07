/**
 * Сервис поиска.
 *
 * Отправляет POST-запрос на GIS API с координатами пользователя и текстовым запросом.
 * Бекенд возвращает результат сгруппированный по категориям
 * (streets / settlements / buildings / pois), который конвертируется
 * в единый плоский список мест (Place).
 */

import { apiClient } from "./api";

/** Точка в GeoJSON: [lon, lat] */
type GisPosition = [number, number];

/** Геометрии, которые возвращает бекенд (GeoJSON) */
export type GisGeometry =
  | { type: "Point"; coordinates: GisPosition }
  | { type: "LineString"; coordinates: GisPosition[] }
  | { type: "MultiLineString"; coordinates: GisPosition[][] }
  | { type: "Polygon"; coordinates: GisPosition[][] }
  | { type: "MultiPolygon"; coordinates: GisPosition[][][] };

/** Остановка маршрута (для отрисовки на карте) */
export interface SearchPlaceStop {
  name: string | null;
  geometry: GisGeometry | null;
}

/** Одно найденное место */
export interface SearchPlace {
  id: number | string;
  name: string;
  addr: string | null;
  /** GeoJSON-геометрия объекта (для отображения на карте) */
  geometry: GisGeometry | null;
  /** Остановки маршрута (только у маршрутов ОТ) */
  stops?: SearchPlaceStop[];
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
  lon: number;
}

// --- Ответ GIS API (см. API.md проекта tavda.info-gis) ---

interface SearchStreet {
  name: string | null;
  full_name: string | null;
  highway?: string | null;
  settlement?: string | null;
  geometry: GisGeometry;
}

interface SearchSettlement {
  id: number;
  name: string;
  display_name: string | null;
  official_status?: string | null;
  geometry: GisGeometry;
}

interface SearchBuilding {
  id: number;
  housenumber?: string | null;
  street?: string | null;
  place?: string | null;
  settlement?: string | null;
  full_name: string | null;
  geometry: GisGeometry;
}

interface SearchPoi {
  osm_type: string;
  osm_id: number;
  name: string | null;
  category: string;
  category_label?: string;
  geometry: GisGeometry;
}

interface SearchStop {
  osm_type: string;
  osm_id: number;
  kind: string;
  name: string | null;
  /** Номера маршрутов (ref), обслуживающих остановку */
  routes: string[];
  geometry: GisGeometry;
}

interface SearchRoute {
  id: number;
  ref: string | null;
  name: string | null;
  from: string | null;
  to: string | null;
  operator: string | null;
  stops: SearchStop[];
  geometry: GisGeometry;
}

interface GisApiResponse {
  query?: string;
  results: {
    streets?: SearchStreet[];
    settlements?: SearchSettlement[];
    buildings?: SearchBuilding[];
    pois?: SearchPoi[];
    stops?: SearchStop[];
    routes?: SearchRoute[];
  };
}

/** Название маршрута: «Автобус 9: ТФК — Техникум» или «№9 ТФК — Техникум» */
function routeName(r: SearchRoute): string {
  if (r.name) return r.name;
  const parts = [r.ref ? `№${r.ref}` : "", r.from, r.to].filter(Boolean);
  return parts.join(" ") || "Маршрут";
}

/**
 * Выполнить поиск.
 *
 * @param payload - объект с текстом запроса и координатами
 * @returns SearchResult со списком мест и сообщением для пользователя
 */
export async function search(payload: SearchPayload): Promise<SearchResult> {
  const { query, lat, lon } = payload;

  try {
    const response = await apiClient.post<GisApiResponse>("", { query, lat, lon });
    const results = response.data?.results ?? {};

    // Порядок вывода: дома → маршруты ОТ → остановки → населённые пункты → улицы → точки интереса
    const places: SearchPlace[] = [];

    (results.buildings ?? []).forEach((b) => {
      places.push({
        id: b.id,
        name: b.full_name ?? `${b.street ?? ""} ${b.housenumber ?? ""}`.trim(),
        addr: b.settlement ?? null,
        geometry: b.geometry ?? null,
      });
    });

    (results.routes ?? []).forEach((r) => {
      places.push({
        id: `route-${r.id}`,
        name: routeName(r),
        addr: [r.from, r.to].filter(Boolean).join(" — ") || r.operator || null,
        geometry: r.geometry ?? null,
        stops: r.stops.map((s) => ({ name: s.name, geometry: s.geometry ?? null })),
      });
    });

    (results.stops ?? []).forEach((s) => {
      places.push({
        id: `stop-${s.osm_type}-${s.osm_id}`,
        name: s.name ?? "Остановка",
        addr: s.routes.length > 0 ? `Маршруты: ${s.routes.join(", ")}` : null,
        geometry: s.geometry ?? null,
      });
    });

    (results.settlements ?? []).forEach((s) => {
      places.push({
        id: s.id,
        name: s.display_name ?? s.name,
        addr: s.official_status ?? null,
        geometry: s.geometry ?? null,
      });
    });

    (results.streets ?? []).forEach((street, index) => {
      places.push({
        id: `street-${index}`,
        name: street.full_name ?? street.name ?? "Улица",
        addr: street.settlement ?? null,
        geometry: street.geometry ?? null,
      });
    });

    (results.pois ?? []).forEach((p) => {
      const name = p.name ?? p.category_label;
      places.push({
        id: p.osm_id,
        name: name ?? "Объект",
        addr: name ? (p.category_label ?? null) : null,
        geometry: p.geometry ?? null,
      });
    });

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