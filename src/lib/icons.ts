import type { PlaceType } from "./search";

// ─── Цвета категорий ───────────────────────────────────────────────────────

const COLORS: Record<string, string> = {
  building: "#78716c",
  route: "#8b5cf6",
  stop: "#0ea5e9",
  settlement: "#f59e0b",
  street: "#64748b",
  poi: "#ef4444",
  food: "#f97316",
  shop: "#ec4899",
  health: "#ef4444",
  education: "#3b82f6",
  culture: "#a855f7",
  fuel: "#eab308",
  finance: "#14b8a6",
  accommodation: "#6366f1",
  sport: "#22c55e",
  service: "#0ea5e9",
};

// ─── SVG-иконки (белые, на viewBox 24×24) ──────────────────────────────────

const SVG: Record<string, string> = {
  // building — дом
  building: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3L12 3z"/></svg>`,
  // route — ветка маршрута
  route: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M6 8v4a4 4 0 0 0 4 4h2"/></svg>`,
  // stop — автобус
  stop: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 11V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4a1 1 0 0 1 1 1v3h-1v1a2 2 0 0 1-2 2v1h-2v-1H8v1H6v-1a2 2 0 0 1-2-2v-1H3v-3a1 1 0 0 1 1-1Zm2 0h12V7a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4Zm1.5 5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm11 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"/></svg>`,
  // settlement — здание с флагом
  settlement: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 21V9l7-6 7 6v12h-6v-5h-2v5H5z"/></svg>`,
  // street — дорога
  street: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20 10 4M14 4l6 16M10 10h4M11 14h2"/></svg>`,
  // poi (default) — каплевидный пин
  poi: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>`,
  // food — вилка и нож
  food: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v7c0 1.1-.9 2-2 2H4v11h2V11h1V2h2zm5 0v20h2V14h3c1.1 0 2-.9 2-2V2h-2v6h-1V2h-2z"/></svg>`,
  // shop — пакет
  shop: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z"/></svg>`,
  // health — медицинский крест
  health: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 2h4v7h7v4h-7v7h-4v-7H3v-4h7V2z"/></svg>`,
  // education — шапка выпускника
  education: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zm0 12.18L5.28 11.5 12 7.82l6.72 3.68L12 15.18zM17 20H7v1c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-1z"/></svg>`,
  // culture — театральная маска
  culture: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.03 3 3 7.03 3 12c0 .37.03.73.07 1.09C2.4 12.81 2 12.42 2 12c0-5.52 4.48-10 10-10s10 4.48 10 10c0 .42-.4.81-.93 1.09.04-.36.07-.72.07-1.09 0-4.97-4.03-9-9-9zm0 16c-3.31 0-6-2.69-6-6 0-2.03 1.01-3.83 2.56-4.91L12 14l3.44-8.91C16.99 6.17 18 7.97 18 10c0 3.31-2.69 6-6 6z"/></svg>`,
  // fuel — колонка
  fuel: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 10V4H6v6H2v10h20V10h-4zM8 6h2v4H8V6zm8 12H4v-6h4v2h8v2h0zm2-2h-4v-4h4v4zm-2-6h-2V6h2v4z"/></svg>`,
  // finance — рубль
  finance: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>`,
  // accommodation — кровать
  accommodation: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V7H1v10h2v-3h18v3h2V11c0-2.21-1.79-4-4-4z"/></svg>`,
  // sport — мяч
  sport: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM5.61 16.78C4.6 15.45 4 13.8 4 12s.6-3.45 1.61-4.78C7.06 8.31 8 10.05 8 12s-.94 3.69-2.39 4.78zM12 20c-1.89 0-3.63-.66-5-1.76C8.61 16.61 10 14.44 10 12s-1.39-4.61-3-6.24C8.37 4.66 10.11 4 12 4s3.63.66 5 1.76C15.39 7.39 14 9.56 14 12s1.39 4.61 3 6.24c-1.37 1.1-3.11 1.76-5 1.76zm6.39-3.22C16.94 15.69 16 13.95 16 12s.94-3.69 2.39-4.78C19.4 8.55 20 10.2 20 12s-.6 3.45-1.61 4.78z"/></svg>`,
  // service — люди/сообщество
  service: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
};

// ─── Категории POI → подтип иконки ─────────────────────────────────────────

const CATEGORY_ICON: Record<string, string> = {
  cafe: "food",
  restaurant: "food",
  fast_food: "food",
  bar: "food",
  pub: "food",
  biergarten: "food",
  ice_cream: "food",
  food_court: "food",

  shop: "shop",
  supermarket: "shop",
  convenience: "shop",
  department_store: "shop",
  mall: "shop",
  clothes: "shop",
  electronics: "shop",
  furniture: "shop",
  hardware: "shop",
  bakery: "shop",
  butcher: "shop",
  greengrocer: "shop",
  alcohol: "shop",
  kiosk: "shop",

  hospital: "health",
  clinic: "health",
  pharmacy: "health",
  doctors: "health",
  dentist: "health",
  veterinary: "health",
  optician: "health",

  school: "education",
  university: "education",
  kindergarten: "education",
  college: "education",
  library: "education",
  research_institute: "education",

  cinema: "culture",
  theatre: "culture",
  museum: "culture",
  arts_centre: "culture",
  gallery: "culture",
  nightclub: "culture",
  music_venue: "culture",

  fuel: "fuel",

  bank: "finance",
  atm: "finance",
  bureau_de_change: "finance",

  hotel: "accommodation",
  motel: "accommodation",
  hostel: "accommodation",
  guest_house: "accommodation",

  sports_centre: "sport",
  stadium: "sport",
  fitness_centre: "sport",
  swimming_pool: "sport",
  pitch: "sport",
  tennis: "sport",

  community_centre: "service",
  social_facility: "service",
  post_office: "service",
  police: "service",
  fire_station: "service",
  townhall: "service",
  place_of_worship: "service",
  car_wash: "service",
  car_rental: "service",
};

// ─── Публичное API (чистые функции, без Leaflet — безопасно для SSR) ──────

/** Ключ иконки (подтипа) для типа объекта и категории POI */
export function getIconKey(type: PlaceType, category?: string): string {
  if (type === "poi" && category) {
    const mapped = CATEGORY_ICON[category];
    if (mapped) return mapped;
  }
  return type;
}

/** CSS-класс маркера (общий + по-подтипам) */
export function getMarkerClass(type: PlaceType, category?: string): string {
  return `poi-marker poi-marker-${getIconKey(type, category)}`;
}

/** Цвет фона маркера */
export function getMarkerColor(type: PlaceType, category?: string): string {
  return COLORS[getIconKey(type, category)] ?? COLORS.poi;
}

/** SVG-иконка (строка) для вставки в DOM */
export function getMarkerSvg(type: PlaceType, category?: string): string {
  return SVG[getIconKey(type, category)] ?? SVG.poi;
}