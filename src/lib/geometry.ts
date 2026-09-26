/**
 * Сервис геометрии.
 *
 * Поиск (`POST /osm/search`) не возвращает геометрию — только идентификаторы
 * объектов и `label_point` для маркера. Полная геометрия и данные для
 * отрисовки приходят отдельным запросом `POST /osm/geometry` по идентификаторам
 * из ответа поиска.
 *
 * Ответ самодостаточен: готовая подпись (`label`), атрибуты объекта для
 * стилизации и группировки, геометрия и `label_point`. Поэтому отрисовка
 * строится только на данных этого ответа — данные поиска используются лишь
 * там, где их нет в ответе геометрии (список маршрутов остановки) и как
 * запасной вариант подписи.
 *
 * Один запрос — до 2000 объектов, смешивать типы можно. Ненайденный объект
 * приходит с `geometry: null` и не считается ошибкой.
 */

import { apiClient, API } from "./api";
import { streetAddress } from "./address";
import type { GisGeometry, GisPoint, PlaceType, SearchPlace } from "./search";

/** Тип объекта (совпадает со значением `type` в ответе поиска) */
export type GeometryType =
  "street" | "settlement" | "building" | "poi" | "stop" | "route";

/** Ссылка на объект: тип + идентификатор из ответа поиска */
export interface GeometryRef {
  type: GeometryType;
  id: number;
}

/** Элемент ответа `POST /osm/geometry` */
interface GeometryResponseItem extends GeometryRef {
  /** Готовая подпись объекта (может отсутствовать) */
  label?: string | null;
  name?: string | null;
  /** Улица: тип дороги и населённый пункт */
  highway?: string | null;
  settlement?: string | null;
  settlement_id?: number | null;
  /** НП: тип места и официальный статус */
  place?: string | null;
  official_status?: string | null;
  /** Здание: улица и номер дома */
  street?: string | null;
  housenumber?: string | null;
  /** POI: тип объекта и русская подпись — выбор иконки */
  category?: string | null;
  category_label?: string | null;
  /** Остановка: вид и код */
  kind?: string | null;
  ref?: string | null;
  /** Маршрут: начало, конец, перевозчик */
  from?: string | null;
  to?: string | null;
  operator?: string | null;
  /** Маршрут: остановки следования по порядку (только у маршрута) */
  stops?: RouteStopResponse[];
  geometry: GisGeometry | null;
  label_point?: GisPoint | null;
}

/** Остановка в составе маршрута в ответе `POST /osm/geometry` */
interface RouteStopResponse {
  label?: string | null;
  name?: string | null;
  kind?: string | null;
  label_point?: GisPoint | null;
}

interface GeometryResponse {
  items?: GeometryResponseItem[];
}

/** Остановка маршрута, готовая к отрисовке */
export interface MapObjectStop {
  /** Подпись из поля label (может отсутствовать у безымянной остановки) */
  label: string | null;
  name: string | null;
  kind: string | null;
  geometry: GisGeometry | null;
  labelPoint: GisPoint | null;
}

/**
 * Объект, готовый к отрисовке на карте.
 *
 * Все поля кроме `stops` приходят из ответа `POST /osm/geometry`.
 * `type` + `id` — пара, которая попадает в URL карты (`?object=type:id`),
 * по ней объект можно восстановить по прямой ссылке.
 */
export interface MapObject {
  type: PlaceType;
  id: number;
  /** Готовая подпись объекта */
  label: string | null;
  /** Короткое имя (для иконки/попапа) */
  name: string | null;
  /** Вторая строка описания: населённый пункт, маршруты, «из — в» */
  addr: string | null;
  geometry: GisGeometry | null;
  labelPoint: GisPoint | null;
  /** Категория POI — выбор иконки */
  category?: string;
  /** Остановки маршрута по порядку следования */
  stops?: MapObjectStop[];
}

/** Ограничение API: не больше 2000 объектов за один запрос */
const MAX_ITEMS = 2000;

/** Ключ объекта в карте загруженных данных */
function key(ref: GeometryRef): string {
  return `${ref.type}:${ref.id}`;
}

/** Проверка строки на соответствие типу объекта из API */
export function isGeometryType(value: string): value is GeometryType {
  return ["street", "settlement", "building", "poi", "stop", "route"].includes(
    value,
  );
}

/** Разбор параметра `?object=street:129211913` в ссылку на объект */
export function parseObjectParam(raw: string | null): GeometryRef | null {
  if (!raw) return null;
  const sep = raw.indexOf(":");
  if (sep < 0) return null;
  const type = raw.slice(0, sep).toLowerCase();
  const id = parseInt(raw.slice(sep + 1), 10);
  if (!isGeometryType(type) || !Number.isFinite(id)) return null;
  return { type, id };
}

/** Ссылка на объект для URL карты: `street:129211913` */
export function formatObjectParam(ref: GeometryRef): string {
  return `${ref.type}:${ref.id}`;
}

/**
 * Загрузить данные объектов одним запросом.
 *
 * Дубликаты отбрасываются, порядок не важен. При ошибке сети возвращается
 * пустая карта — вызывающий код оставит на карте только маркер по `label_point`.
 *
 * @param refs - ссылки на объекты из ответа поиска
 * @returns карта «тип:ID → элемент ответа»
 */
export async function fetchGeometry(
  refs: GeometryRef[],
): Promise<Map<string, GeometryResponseItem>> {
  const unique = [...new Map(refs.map((r) => [key(r), r])).values()];
  if (unique.length === 0) return new Map();

  try {
    const response = await apiClient.post<GeometryResponse>(API.geometry, {
      items: unique.slice(0, MAX_ITEMS),
    });

    const loaded = new Map<string, GeometryResponseItem>();
    (response.data?.items ?? []).forEach((item) => {
      loaded.set(`${item.type}:${item.id}`, item);
    });
    return loaded;
  } catch {
    return new Map();
  }
}

/** Вид остановки → подпись для описания (в API значения английские) */
const STOP_KIND_LABELS: Record<string, string> = {
  bus_stop: "остановка",
  platform: "платформа",
  stop_position: "посадка",
};

/** Вторая строка описания — собирается из атрибутов объекта */
function objectAddr(item: GeometryResponseItem): string | null {
  switch (item.type) {
    case "route":
      return (
        [item.from, item.to].filter(Boolean).join(" — ") ||
        item.operator ||
        null
      );
    case "stop":
      return (
        [
          item.ref || (item.kind ? STOP_KIND_LABELS[item.kind] : null),
          streetAddress(item),
        ]
          .filter(Boolean)
          .join(", ") || null
      );
    case "poi":
      // Адрес важнее категории: он есть у части POI, категория — у всех
      return (
        streetAddress(item) ??
        (item.name ? (item.category_label ?? null) : null)
      );
    default:
      return item.settlement ?? item.official_status ?? null;
  }
}

/** Превратить элемент ответа в объект для отрисовки */
function toMapObject(item: GeometryResponseItem): MapObject {
  return {
    type: item.type,
    id: item.id,
    label: item.label ?? item.name ?? null,
    name: item.name ?? null,
    addr: objectAddr(item),
    geometry: item.geometry ?? null,
    labelPoint: item.label_point ?? null,
    ...(item.type === "poi" && item.category
      ? { category: item.category }
      : {}),
    // Остановки маршрута: геометрии в ответе нет, маркер ставится по
    // label_point, подпись берётся из label (у безымянной — из ref)
    ...(item.stops && item.stops.length > 0
      ? {
          stops: item.stops.map((stop) => ({
            label: stop.label ?? stop.name ?? null,
            name: stop.name ?? null,
            kind: stop.kind ?? null,
            geometry: null,
            labelPoint: stop.label_point ?? null,
          })),
        }
      : {}),
  };
}

/**
 * Загрузить объект для отрисовки по прямой ссылке (из URL).
 *
 * Поиск не нужен: ответ геометрии содержит подпись и все атрибуты.
 *
 * @param ref - тип и идентификатор объекта
 * @returns объект для отрисовки либо null, если объект не найден
 */
export async function loadObjectByRef(
  ref: GeometryRef,
): Promise<MapObject | null> {
  const loaded = await fetchGeometry([ref]);
  const item = loaded.get(key(ref));
  if (!item || !item.geometry) return null;
  return toMapObject(item);
}

/**
 * Загрузить объект для отрисовки по результату поиска.
 *
 * Запрос один: сам объект и все остановки маршрута. Данные для отрисовки
 * берутся из ответа геометрии; из результата поиска используется только то,
 * чего в ответе геометрии нет, — список обслуживающих остановку маршрутов,
 * и подпись как запасной вариант.
 *
 * @param place - результат поиска
 * @returns объект для отрисовки либо null, если объект не найден
 */
export async function loadPlaceObject(
  place: SearchPlace,
): Promise<MapObject | null> {
  const stopRefs = place.stops.map((s) => s.ref);
  const loaded = await fetchGeometry([place.ref, ...stopRefs]);
  const item = loaded.get(key(place.ref));
  if (!item || !item.geometry) return null;

  return {
    ...toMapObject(item),
    // Подпись из поиска — запасной вариант (например, остановка без имени)
    label: item.label ?? item.name ?? place.name,
    name: item.name ?? place.name,
    // У остановки строка описания — маршруты (их нет в ответе геометрии)
    // вместе с адресом из тегов; если её нет, берём вид остановки и адрес
    // из ответа геометрии
    addr:
      place.type === "stop"
        ? (place.addr ?? objectAddr(item))
        : objectAddr(item),
    // Остановки маршрута — из результата поиска (вместе с их геометрией).
    // Если поиск остановок не дал, остаются те, что пришли в ответе геометрии
    ...(place.type === "route" && stopRefs.length > 0
      ? {
          stops: place.stops.map((stop) => {
            const stopItem = loaded.get(key(stop.ref));
            return {
              label:
                stopItem?.label ?? stopItem?.name ?? stop.name ?? "Остановка",
              name: stopItem?.name ?? stop.name,
              kind: stopItem?.kind ?? null,
              geometry: stopItem?.geometry ?? null,
              labelPoint: stopItem?.label_point ?? stop.labelPoint ?? null,
            };
          }),
        }
      : {}),
  };
}
