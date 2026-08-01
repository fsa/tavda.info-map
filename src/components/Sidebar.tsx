import { useState, useEffect, useRef, useCallback, type FormEvent, type KeyboardEvent } from "react";
import type { MapInstance, MapLayer } from "../lib/map";
import { LAYERS } from "../lib/layers";
import { search, type SearchResult } from "../lib/search";

const STORAGE_KEY_SHOW_MARKER = "tavda:showUserMarker";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [activeLayer, setActiveLayerState] = useState<MapLayer>("osm");
  const [mapInstance, setMapInstance] = useState<MapInstance | null>(null);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Состояние переключателей
  const [showMarker, setShowMarker] = useState(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_SHOW_MARKER) === "true";
    }
    return false;
  });
  const [liveTracking, setLiveTracking] = useState(false);

  // Синхронизация showMarker с картой и localStorage
  const syncShowMarker = useCallback((inst: MapInstance, visible: boolean) => {
    if (visible) {
      inst.showUserMarker();
    } else {
      inst.hideUserMarker();
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_SHOW_MARKER, String(visible));
    }
  }, []);

  // Синхронизация liveTracking с картой
  const syncLiveTracking = useCallback((inst: MapInstance, enabled: boolean) => {
    if (enabled) {
      inst.startWatching();
    } else {
      inst.stopWatching();
    }
  }, []);

  useEffect(() => {
    // Check if map already initialized (script runs before React hydrates)
    const existing = (window as any).__map as MapInstance | undefined;
    if (existing) {
      setMapInstance(existing);
      setActiveLayerState(existing.getActiveLayer());
      // Применяем сохранённую настройку показа маркера
      if (showMarker) {
        existing.showUserMarker();
      }
      return;
    }
    // Otherwise wait for the event
    const handler = (e: Event) => {
      const inst = (e as CustomEvent).detail as MapInstance;
      setMapInstance(inst);
      setActiveLayerState(inst.getActiveLayer());
      // Применяем сохранённую настройку показа маркера
      if (showMarker) {
        inst.showUserMarker();
      }
    };
    window.addEventListener("map:ready", handler);
    return () => window.removeEventListener("map:ready", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLayerChange = (layer: MapLayer) => {
    setActiveLayerState(layer);
    mapInstance?.setActiveLayer(layer);
  };

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearching(true);
    setSearchResult(null);

    // Получаем текущие координаты карты
    const map = (window as any).__map as MapInstance | undefined;
    const center = map?.map.getCenter();

    const result = await search({
      query: trimmed,
      lat: center?.lat ?? 58.0419,
      lng: center?.lng ?? 65.273235,
    });

    setSearchResult(result);
    setSearching(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const sidebarClass = open ? "sidebar sidebar-open" : "sidebar sidebar-closed";

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="menu-button"
          aria-label="Открыть меню"
        >
          <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      )}

      {open && (
        <div className="overlay" onClick={() => setOpen(false)} aria-hidden />
      )}

      <aside className={sidebarClass}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <a href="https://tavda.info" className="sidebar-logo-link" aria-label="На главную Тавда.инфо">
              <img src="/logo.svg" alt="" className="sidebar-logo" />
              <span className="sidebar-title">Тавда.инфо</span>
            </a>
          </div>
          <div className="sidebar-actions">
            <button
              onClick={() => setOpen(false)}
              className="icon-btn"
              aria-label="Закрыть меню"
              title="Закрыть"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="layers-section">
            <label className="layers-label" htmlFor="layer-select">Слой карты</label>
            <select
              id="layer-select"
              className="layer-select"
              value={activeLayer}
              onChange={(e) => handleLayerChange(e.target.value as MapLayer)}
            >
              {LAYERS.map((layer) => (
                <option key={layer.id} value={layer.id}>
                  {layer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Geolocation toggles */}
          <div className="geolocation-section">
            <label className="toggle-row">
              <span className="toggle-label">Показать моё местоположение</span>
              <span
                className={`toggle-switch${showMarker ? " toggle-switch-on" : ""}`}
                role="switch"
                aria-checked={showMarker}
                tabIndex={0}
                onClick={() => {
                  const next = !showMarker;
                  setShowMarker(next);
                  if (mapInstance) syncShowMarker(mapInstance, next);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    const next = !showMarker;
                    setShowMarker(next);
                    if (mapInstance) syncShowMarker(mapInstance, next);
                  }
                }}
              >
                <span className="toggle-knob" />
              </span>
            </label>

            <label className="toggle-row">
              <span className="toggle-label">Постоянное отслеживание</span>
              <span
                className={`toggle-switch${liveTracking ? " toggle-switch-on" : ""}`}
                role="switch"
                aria-checked={liveTracking}
                tabIndex={0}
                onClick={() => {
                  const next = !liveTracking;
                  setLiveTracking(next);
                  if (mapInstance) syncLiveTracking(mapInstance, next);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    const next = !liveTracking;
                    setLiveTracking(next);
                    if (mapInstance) syncLiveTracking(mapInstance, next);
                  }
                }}
              >
                <span className="toggle-knob" />
              </span>
            </label>
          </div>

          <div className="search-wrapper">
            <label className="search-label">Поиск</label>
            <form className="search-form" onSubmit={handleFormSubmit}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Поиск"
                className="search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="submit"
                className="search-submit-btn"
                aria-label="Найти"
                tabIndex={-1}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
                </svg>
              </button>
            </form>

            {searching && (
              <div className="search-status search-status-loading">Поиск…</div>
            )}

            {searchResult && (
              <div className={`search-status search-status-${searchResult.type}`}>
                {searchResult.message}
              </div>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}
