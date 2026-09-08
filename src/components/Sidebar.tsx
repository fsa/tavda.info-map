import { useState, useEffect, useRef, type TransitionEvent } from "react";

declare const __GIT_HASH__: string;
declare const __BUILD_TIME__: string;
import type { MapInstance, MapLayer } from "../lib/map";
import { LAYERS } from "../lib/layers";
import type { SearchPlace } from "../lib/search";
import { geoService } from "../lib/geolocation";
import SearchPanel from "./SearchPanel";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [activeLayer, setActiveLayerState] = useState<MapLayer>("osm");
  const [mapInstance, setMapInstance] = useState<MapInstance | null>(null);
  const [selected, setSelected] = useState<SearchPlace | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  // true, пока идёт анимация закрытия — чтобы кнопка-гамбургер не мигала раньше времени
  const [closing, setClosing] = useState(false);

  // При гидратации React сравнивает серверный HTML с клиентским рендером.
  // На сервере localStorage нет → showMarker=false. Чтобы не было ошибки
  // гидратации, на клиенте при первом рендере тоже показываем false,
  // а в useEffect читаем реальное состояние из сервиса.
  const [showMarker, setShowMarker] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [followMode, setFollowMode] = useState(false);

  // После гидратации синхронизируемся с сервисом
  useEffect(() => {
    const s = geoService.getState();
    setShowMarker(s.showMarker);
    setTracking(s.tracking);
    setFollowMode(s.followMode);
  }, []);

  // Подписываемся на изменения сервиса
  useEffect(() => {
    const unsub = geoService.on((s) => {
      setShowMarker(s.showMarker);
      setTracking(s.tracking);
      setFollowMode(s.followMode);
    });
    return unsub;
  }, []);

  useEffect(() => {
    // Check if map already initialized (script runs before React hydrates)
    const existing = (window as any).__map as MapInstance | undefined;
    if (existing) {
      setMapInstance(existing);
      setActiveLayerState(existing.getActiveLayer());
    } else {
      // Otherwise wait for the event
      const handler = (e: Event) => {
        const inst = (e as CustomEvent).detail as MapInstance;
        setMapInstance(inst);
        setActiveLayerState(inst.getActiveLayer());
      };
      window.addEventListener("map:ready", handler);
      return () => window.removeEventListener("map:ready", handler);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLayerChange = (layer: MapLayer) => {
    setActiveLayerState(layer);
    mapInstance?.setActiveLayer(layer);
  };

  const selectResult = (place: SearchPlace) => {
    if (!place.geometry) return;
    setSelected(place);
    mapInstance?.showFeature(place.geometry, place.name, place.addr, place.stops, place.type, place.category, place.labelPoint);
    // На мобильных места мало — сворачиваем меню, чтобы был виден результат
    if (window.matchMedia("(max-width: 767px)").matches) {
      handleClose();
    }
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setClosing(true);
  };

  const handleTransitionEnd = (e: TransitionEvent<HTMLElement>) => {
    if (e.target !== sidebarRef.current || e.propertyName !== "transform") return;
    setClosing(false);
  };

  const sidebarClass = open ? "sidebar sidebar-open" : "sidebar sidebar-closed";

  // Панель описания видна, когда не перекрыта открытым на мобильных меню
  const wide =
    typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;

  return (
    <>
      {!open && !closing && (
        <button
          onClick={handleOpen}
          className="menu-button"
          aria-label="Открыть меню"
        >
          <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      )}

      {selected && (wide || !open) && (
        <div className="selected-object-bar">
          <div className="selected-object-info">
            <span className="selected-object-name">{selected.name}</span>
            {selected.addr && (
              <span className="selected-object-addr">{selected.addr}</span>
            )}
          </div>
          <button
            type="button"
            className="selected-object-close"
            onClick={() => setSelected(null)}
            aria-label="Скрыть описание"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {open && (
        <div className="overlay" onClick={handleClose} aria-hidden />
      )}

      <aside
        ref={sidebarRef}
        className={sidebarClass}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <a href="https://tavda.info" className="sidebar-logo-link" aria-label="На главную Тавда.инфо">
              <img src="/logo.svg" alt="" className="sidebar-logo" />
              <span className="sidebar-title">Тавда.инфо</span>
            </a>
          </div>
          <div className="sidebar-actions">
            <button
              onClick={handleClose}
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

          {/* Geolocation controls */}
          <div className="geolocation-section">
            <label className="geolocation-label">Геолокация</label>
            <div className="geo-btn-group">
              <button
                className={`geo-btn${showMarker ? " geo-btn-active" : ""}`}
                onClick={() => {
                  geoService.setShowMarker(!showMarker);
                }}
                title="Показать маркер на карте"
                aria-pressed={showMarker}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                <span>Метка</span>
              </button>
              <button
                className={`geo-btn${tracking ? " geo-btn-active" : ""}${followMode ? " geo-btn-follow" : ""}${!showMarker ? " geo-btn-disabled" : ""}`}
                onClick={() => {
                  if (!showMarker) return;
                  geoService.setTracking(!tracking);
                }}
                title={showMarker
                  ? followMode
                    ? "Слежение активно, карта следует за вами"
                    : "Постоянное отслеживание местоположения"
                  : "Сначала включите метку"}
                aria-pressed={tracking}
                disabled={!showMarker}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                  <circle cx="12" cy="12" r="3" strokeWidth="2" />
                  <path strokeWidth="2" strokeLinecap="round" d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                </svg>
                <span>Слежение</span>
              </button>
            </div>
          </div>

          <SearchPanel
            onSelect={selectResult}
            onSearchStart={() => setSelected(null)}
          />

          <div className="sidebar-version">
            {import.meta.env.PROD
              ? `${__GIT_HASH__} ${__BUILD_TIME__.slice(0, 10)}`
              : "dev"}
          </div>
        </nav>
      </aside>
    </>
  );
}
