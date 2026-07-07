import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

export type MapLayer = "osm" | "transport";

const LAYER_URLS: Record<MapLayer, string> = {
  osm: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  transport:
    "https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=e426aa11f4764b36b140f271cd2c19e0",
};

const LAYER_ATTRIBUTION: Record<MapLayer, string> = {
  osm: "&copy; OpenStreetMap contributors",
  transport: "&copy; Thunderforest",
};

function readParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    lat: parseFloat(p.get("lat") || "58.0419"),
    lng: parseFloat(p.get("lng") || "65.273235"),
    zoom: parseInt(p.get("zoom") || "13"),
    layer: (p.get("layer") === "transport" ? "transport" : "osm") as MapLayer,
  };
}

function writeParams(lat: number, lng: number, zoom: number, layer: MapLayer) {
  const p = new URLSearchParams();
  p.set("lat", lat.toFixed(6));
  p.set("lng", lng.toFixed(6));
  p.set("zoom", zoom.toString());
  p.set("layer", layer);
  window.history.replaceState(null, "", `?${p.toString()}`);
}

export function initMap(containerId: string) {
  // Fix default Leaflet icons (webpack/asset bundler breaks paths)
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });

  const state = readParams();
  const tileLayers: Record<MapLayer, L.TileLayer> = {
    osm: L.tileLayer(LAYER_URLS.osm, { attribution: LAYER_ATTRIBUTION.osm }),
    transport: L.tileLayer(LAYER_URLS.transport, {
      attribution: LAYER_ATTRIBUTION.transport,
    }),
  };

  const map = L.map(containerId, {
    center: [state.lat, state.lng],
    zoom: state.zoom,
    zoomControl: false,
    attributionControl: false,
  });

  tileLayers[state.layer].addTo(map);

  // URL sync
  map.on("moveend", () => {
    const c = map.getCenter();
    writeParams(c.lat, c.lng, map.getZoom(), currentLayer);
  });
  map.on("zoomend", () => {
    const c = map.getCenter();
    writeParams(c.lat, c.lng, map.getZoom(), currentLayer);
  });

  // Layer management
  let currentLayer: MapLayer = state.layer;

  function setActiveLayer(layer: MapLayer) {
    if (layer === currentLayer) return;
    map.eachLayer((l) => {
      if (l instanceof L.TileLayer) map.removeLayer(l);
    });
    tileLayers[layer].addTo(map);
    currentLayer = layer;
    const c = map.getCenter();
    writeParams(c.lat, c.lng, map.getZoom(), layer);
  }

  function getActiveLayer(): MapLayer {
    return currentLayer;
  }

  // Zoom controls
  const zoomControl = L.control({ position: "bottomright" });
  zoomControl.onAdd = () => {
    const div = L.DomUtil.create("div", "zoom-controls");
    const zoomIn = L.DomUtil.create("button", "zoom-button", div);
    zoomIn.textContent = "+";
    zoomIn.addEventListener("click", (e) => {
      e.stopPropagation();
      map.zoomIn();
    });
    const zoomOut = L.DomUtil.create("button", "zoom-button", div);
    zoomOut.textContent = "−";
    zoomOut.addEventListener("click", (e) => {
      e.stopPropagation();
      map.zoomOut();
    });
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  zoomControl.addTo(map);

  return { map, setActiveLayer, getActiveLayer };
}

export type MapInstance = ReturnType<typeof initMap>;
