import { useState, useEffect } from "react";
import type { MapInstance, MapLayer } from "../lib/map";
import { LAYERS } from "../lib/layers";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [activeLayer, setActiveLayerState] = useState<MapLayer>("osm");
  const [mapInstance, setMapInstance] = useState<MapInstance | null>(null);

  useEffect(() => {
    // Check if map already initialized (script runs before React hydrates)
    const existing = (window as any).__map as MapInstance | undefined;
    if (existing) {
      setMapInstance(existing);
      setActiveLayerState(existing.getActiveLayer());
      return;
    }
    // Otherwise wait for the event
    const handler = (e: Event) => {
      const inst = (e as CustomEvent).detail as MapInstance;
      setMapInstance(inst);
      setActiveLayerState(inst.getActiveLayer());
    };
    window.addEventListener("map:ready", handler);
    return () => window.removeEventListener("map:ready", handler);
  }, []);

  const handleLayerChange = (layer: MapLayer) => {
    setActiveLayerState(layer);
    mapInstance?.setActiveLayer(layer);
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
            <a href="https://tavda.info" className="sidebar-back" aria-label="На Тавда.инфо">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7-7 7 7 7" />
              </svg>
            </a>
            <img src="/logo.svg" alt="" className="sidebar-logo" />
            <h2 className="sidebar-title">Карта Тавды</h2>
          </div>
          <div className="sidebar-actions">
            <button
              onClick={() => { mapInstance?.flyToTavda(); setOpen(false); }}
              className="icon-btn"
              aria-label="Показать Тавду на карте"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
              </svg>
            </button>
            <button
              onClick={() => setOpen(false)}
              className="icon-btn"
              aria-label="Скрыть меню"
            >
              ✕
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

          <div className="search-wrapper">
            <label className="search-label">Поиск</label>
            <input type="text" placeholder="Поиск" className="search-input" />
          </div>
        </nav>
      </aside>
    </>
  );
}
