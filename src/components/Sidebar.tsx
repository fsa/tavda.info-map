import { useState, useEffect } from "react";
import type { MapInstance, MapLayer } from "../lib/map";

const LAYER_NAMES: Record<MapLayer, string> = {
  osm: "OpenStreetMap",
  transport: "Транспорт (© Thunderforest)",
};

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
          <h2 className="sidebar-title">Навигация</h2>
          <div className="sidebar-actions">
            <button
              onClick={() => setOpen(false)}
              className="close-btn-desktop"
              aria-label="Скрыть меню"
            >
              ✕
            </button>
            <button
              onClick={() => setOpen(false)}
              className="close-btn-mobile"
              aria-label="Закрыть меню"
            >
              ✕
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a href="https://tavda.info" className="home-link">
            Тавда.инфо
          </a>

          <button className="home-link" onClick={() => mapInstance?.flyToTavda()}>
            Вернуться в Тавду
          </button>

          <div className="search-wrapper">
            <label className="search-label">Поиск</label>
            <input type="text" placeholder="Поиск" className="search-input" />
          </div>

          <div className="layers-section">
            <p className="layers-label">Слои карты</p>
            {(Object.keys(LAYER_NAMES) as MapLayer[]).map((key) => (
              <button
                key={key}
                className={`layer-button ${activeLayer === key ? "layer-active" : "layer-inactive"}`}
                onClick={() => handleLayerChange(key)}
              >
                {LAYER_NAMES[key]}
              </button>
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}
