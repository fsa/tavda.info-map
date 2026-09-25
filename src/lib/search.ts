/**
 * Сервис поиска.
 *
 * Отправляет POST-запрос на GIS API с координатами пользователя и текстовым запросом.
 * Бекенд возвращает результат сгруппированный по категориям
 * (streets / settlements / buildings / pois), который конвертируется
 * в единый плоский список мест (Place).
 *
 * Поиск не возвращает геометрию — только идентификатор объекта (`ref`)
 * и точку для маркера (`labelPoint`). Данные для отрисовки (геометрия,
 * подпись, атрибуты) приходят отдельным запросом — см. geometry.ts.
 */

import { apiClient, API } from "./api";
import { streetAddress } from "./address";
import type { GeometryRef, MapObject } from "./geometry";

/** Точка в GeoJSON: [lon, lat] */
type GisPosition = [number, number];

/** GeoJSON Point */
export type GisPoint = { type: "Point"; coordinates: GisPosition };

/** Геометрии, которые возвращает бекенд (GeoJSON) */
export type GisGeometry =
  | GisPoint
  | { type: "LineString"; coordinates: GisPosition[] }
  | { type: "MultiLineString"; coordinates: GisPosition[][] }
  | { type: "Polygon"; coordinates: GisPosition[][] }
  | { type: "MultiPolygon"; coordinates: GisPosition[][][] };

/** Остановка маршрута в результатах поиска */
export interface SearchPlaceStop {
  name: string | null;
  /** Точка для маркера остановки */
  labelPoint?: GisPoint | null;
  /** Идентификатор для запроса геометрии остановки */
  ref: GeometryRef;
}

/** Тип найденного объекта — определяет выбор иконки на карте и в списке */
export type PlaceType =
  "building" | "route" | "stop" | "settlement" | "street" | "poi";

/** Одно найденное место (без геометрии — она грузится отдельно) */
export interface SearchPlace {
  /** Ключ результата в списке (уникален в пределах типов) */
  id: string;
  name: string;
  addr: string | null;
  /** Остановки маршрута (только у маршрутов ОТ) */
  stops: SearchPlaceStop[];
  /** Точка для маркера объекта (имени) */
  labelPoint?: GisPoint | null;
  /** Тип объекта — используется для выбора иконки */
  type: PlaceType;
  /** Категория POI (например "cafe", "shop", "hospital"), только для type === "poi" */
  category?: string;
  /** Идентификатор объекта для запроса геометрии (POST /osm/geometry) */
  ref: GeometryRef;
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
//
// Поиск не возвращает геометрию: только идентификатор объекта
// и label_point. Геометрия запрашивается отдельно (см. geometry.ts).

interface SearchStreet {
  /** Собственный ID улицы (min(way_id) сегментов) — не OSM ID */
  id: number;
  name: string | null;
  full_name: string | null;
  highway?: string | null;
  settlement?: string | null;
  settlement_id?: number | null;
  /** Точка для маркера названия объекта */
  label_point?: GisPoint | null;
}

interface SearchSettlement {
  /** OSM node ID */
  id: number;
  name: string;
  display_name: string | null;
  official_status?: string | null;
  label_point?: GisPoint | null;
}

interface SearchBuilding {
  /** ID в кодировке imposm: node — положительный, way — отрицательный */
  id: number;
  housenumber?: string | null;
  street?: string | null;
  place?: string | null;
  settlement?: string | null;
  full_name: string | null;
  label_point?: GisPoint | null;
}

interface SearchPoi {
  osm_type: string;
  osm_id: number;
  name: string | null;
  /** Адрес из тегов OSM: есть примерно у 12% точек интереса */
  street?: string;
  housenumber?: string;
  settlement?: string;
  category: string;
  category_label?: string;
  label_point?: GisPoint | null;
}

interface SearchStop {
  osm_type: string;
  osm_id: number;
  kind: string;
  name: string | null;
  /** Адрес из тегов OSM — есть у единиц платформ */
  street?: string;
  housenumber?: string;
  /** Номера маршрутов (ref), обслуживающих остановку */
  routes: string[];
  label_point?: GisPoint | null;
}

interface SearchRoute {
  /** OSM relation ID (route_master либо id одиночного направления) */
  id: number;
  ref: string | null;
  name: string | null;
  from: string | null;
  to: string | null;
  operator: string | null;
  stops: SearchStop[];
  label_point?: GisPoint | null;
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
/** Вторая строка остановки: маршруты, а если есть адрес — он после них */
function stopAddr(s: SearchStop): string | null {
  return (
    [
      s.routes.length > 0 ? `Маршруты: ${s.routes.join(", ")}` : null,
      streetAddress(s),
    ]
      .filter(Boolean)
      .join(" · ") || null
  );
}

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
/**
 * Собрать объект для отрисовки только из данных поиска (без геометрии).
 *
 * Нужен, чтобы маркер с названием появился на карте мгновенно, не дожидаясь
 * ответа /osm/geometry. Дальше объект заменяется на полный, из ответа
 * геометрии, — он и является источником данных для отрисовки.
 *
 * @param place - результат поиска
 * @returns объект для отрисовки без геометрии
 */
export function toPreviewObject(place: SearchPlace): MapObject {
  return {
    type: place.type,
    id: place.ref.id,
    label: place.name,
    name: place.name,
    addr: place.addr,
    geometry: null,
    labelPoint: place.labelPoint ?? null,
    ...(place.category ? { category: place.category } : {}),
    stops: place.stops.map((s) => ({
      label: s.name,
      name: s.name,
      kind: null,
      geometry: null,
      labelPoint: s.labelPoint ?? null,
    })),
  };
}

export async function search(payload: SearchPayload): Promise<SearchResult> {
  const { query, lat, lon } = payload;

  try {
    const response = await apiClient.post<GisApiResponse>(API.search, {
      query,
      lat,
      lon,
    });
    const results = response.data?.results ?? {};

    // Порядок вывода: дома → маршруты ОТ → остановки → населённые пункты → улицы → точки интереса
    const places: SearchPlace[] = [];

    (results.buildings ?? []).forEach((b) => {
      places.push({
        id: `building-${b.id}`,
        name: b.full_name ?? `${b.street ?? ""} ${b.housenumber ?? ""}`.trim(),
        addr: b.settlement ?? null,
        stops: [],
        labelPoint: b.label_point ?? null,
        type: "building",
        ref: { type: "building", id: b.id },
      });
    });

    (results.routes ?? []).forEach((r) => {
      places.push({
        id: `route-${r.id}`,
        name: routeName(r),
        addr: [r.from, r.to].filter(Boolean).join(" — ") || r.operator || null,
        stops: r.stops.map((s) => ({
          name: s.name,
          labelPoint: s.label_point ?? null,
          ref: { type: "stop" as const, id: s.osm_id },
        })),
        labelPoint: r.label_point ?? null,
        type: "route",
        ref: { type: "route", id: r.id },
      });
    });

    (results.stops ?? []).forEach((s) => {
      places.push({
        id: `stop-${s.osm_type}-${s.osm_id}`,
        name: s.name ?? "Остановка",
        addr: stopAddr(s),
        stops: [],
        labelPoint: s.label_point ?? null,
        type: "stop",
        ref: { type: "stop", id: s.osm_id },
      });
    });

    (results.settlements ?? []).forEach((s) => {
      places.push({
        id: `settlement-${s.id}`,
        name: s.display_name ?? s.name,
        addr: s.official_status ?? null,
        stops: [],
        labelPoint: s.label_point ?? null,
        type: "settlement",
        ref: { type: "settlement", id: s.id },
      });
    });

    (results.streets ?? []).forEach((street) => {
      places.push({
        id: `street-${street.id}`,
        name: street.full_name ?? street.name ?? "Улица",
        addr: street.settlement ?? null,
        stops: [],
        labelPoint: street.label_point ?? null,
        type: "street",
        ref: { type: "street", id: street.id },
      });
    });

    (results.pois ?? []).forEach((p) => {
      const name = p.name ?? p.category_label;
      places.push({
        id: `poi-${p.osm_id}`,
        name: name ?? "Объект",
        // Адрес важнее категории: он есть у части POI, категория — у всех
        addr: streetAddress(p) ?? (name ? (p.category_label ?? null) : null),
        stops: [],
        labelPoint: p.label_point ?? null,
        type: "poi",
        category: p.category ?? undefined,
        ref: { type: "poi", id: p.osm_id },
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
