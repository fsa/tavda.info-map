import { useEffect, useState, useCallback } from "react";
import { MapContainer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import MapSearch from "./MapSearch";
import "./map.css";

type MapLayer = "osm" | "transport";

const LAYERS: Record<MapLayer, L.TileLayer> = {
  osm: L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }),
  transport: L.tileLayer(
    "https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=e426aa11f4764b36b140f271cd2c19e0",
    { attribution: "&copy; Thunderforest" }
  ),
};

const LAYER_NAMES: Record<MapLayer, string> = {
  osm: "OpenStreetMap",
  transport: "Транспорт (© Thunderforest)",
};

function ZoomControls() {
  const map = useMap();
  return (
    <div className="zoom-controls">
      <button onClick={() => map.zoomIn()} className="zoom-button">
        +
      </button>
      <button onClick={() => map.zoomOut()} className="zoom-button">
        −
      </button>
    </div>
  );
}

function MapStateManager({
  activeLayer,
  onMapMove,
}: {
  activeLayer: MapLayer;
  onMapMove: (lat: number, lng: number, zoom: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const update = () => {
      const center = map.getCenter();
      onMapMove(center.lat, center.lng, map.getZoom());
    };
    map.on("moveend", update);
    map.on("zoomend", update);
    return () => {
      map.off("moveend", update);
      map.off("zoomend", update);
    };
  }, [map, onMapMove]);

  useEffect(() => {
    map.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });
    LAYERS[activeLayer].addTo(map);
  }, [activeLayer, map]);

  return null;
}

export default function Map() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getInitialState = () => {
    if (typeof window === "undefined") {
      return { lat: 58.0419, lng: 65.273235, zoom: 13, layer: "osm" as MapLayer };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      lat: parseFloat(params.get("lat") || "58.0419"),
      lng: parseFloat(params.get("lng") || "65.273235"),
      zoom: parseInt(params.get("zoom") || "13"),
      layer: (params.get("layer") === "transport" ? "transport" : "osm") as MapLayer,
    };
  };

  const [mapState, setMapState] = useState(getInitialState);
  const position: [number, number] = [mapState.lat, mapState.lng];

  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });
  }, []);

  const updateUrl = useCallback(
    (lat: number, lng: number, zoom: number, layer: MapLayer) => {
      const params = new URLSearchParams();
      params.set("lat", lat.toFixed(6));
      params.set("lng", lng.toFixed(6));
      params.set("zoom", zoom.toString());
      params.set("layer", layer);
      window.history.replaceState(null, "", `?${params.toString()}`);
    },
    []
  );

  const handleMapMove = useCallback(
    (lat: number, lng: number, zoom: number) => {
      setMapState((prev) => ({ ...prev, lat, lng, zoom }));
      updateUrl(lat, lng, zoom, mapState.layer);
    },
    [mapState.layer, updateUrl]
  );

  const handleLayerChange = (layer: MapLayer) => {
    setMapState((prev) => ({ ...prev, layer }));
    updateUrl(mapState.lat, mapState.lng, mapState.zoom, layer);
  };

  const sidebarClass = sidebarOpen ? "sidebar sidebar-open" : "sidebar sidebar-closed";

  return (
    <div className="wrapper">
      <aside className={sidebarClass}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Навигация</h2>
          <div className="sidebar-actions">
            <button
              onClick={() => setSidebarOpen(false)}
              className="close-btn-desktop"
              aria-label="Скрыть меню"
            >
              ✕
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="close-btn-mobile"
              aria-label="Закрыть меню"
            >
              ✕
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a href="https://tavda.info" className="home-link">
            На главную
          </a>

          <MapSearch />

          <div className="layers-section">
            <p className="layers-label">Слои карты</p>
            {(Object.keys(LAYER_NAMES) as MapLayer[]).map((key) => (
              <button
                key={key}
                className={`layer-button ${mapState.layer === key ? "layer-active" : "layer-inactive"}`}
                onClick={() => handleLayerChange(key)}
              >
                {LAYER_NAMES[key]}
              </button>
            ))}
          </div>
        </nav>
      </aside>

      <div className="main-container">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="menu-button"
            aria-label="Открыть меню"
          >
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        )}

        {sidebarOpen && (
          <div className="overlay" onClick={() => setSidebarOpen(false)} aria-hidden />
        )}

        <MapContainer
          center={position}
          zoom={mapState.zoom}
          className="map-container"
          zoomControl={false}
          attributionControl={false}
        >
          <MapStateManager activeLayer={mapState.layer} onMapMove={handleMapMove} />
          <ZoomControls />
        </MapContainer>
      </div>
    </div>
  );
}
