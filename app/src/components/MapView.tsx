import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer } from "@deck.gl/layers";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { SERVICE_COLORS, DEFAULT_COLOR } from "../serviceColors";
import "maplibre-gl/dist/maplibre-gl.css";

const SD_CENTER: [number, number] = [-117.16, 32.72];

interface PointData {
  lat: number;
  lng: number;
  service_name: string;
  status: string;
  comm_plan_name: string;
}

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface Props {
  points: PointData[];
  allPoints: PointData[];
  isFiltered: boolean;
  onBrush: (bounds: Bounds | null) => void;
}

type VizMode = "dots" | "density";

export default function MapView({ points, allPoints, isFiltered, onBrush }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [vizMode, setVizMode] = useState<VizMode>("dots");
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    data: PointData;
  } | null>(null);
  const [hasBrush, setHasBrush] = useState(false);

  // Brush refs (not state — avoids stale closure issues)
  const modeRef = useRef<"idle" | "drawing" | "dragging">("idle");
  const startRef = useRef<{ lng: number; lat: number } | null>(null);
  const dragOffsetRef = useRef<{ dLng: number; dLat: number } | null>(null);
  const currentRectRef = useRef<Bounds | null>(null);
  const onBrushRef = useRef(onBrush);
  onBrushRef.current = onBrush;

  // Initialize map with deck.gl overlay
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      center: SD_CENTER,
      zoom: 11,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "bottom-right");

    const overlay = new MapboxOverlay({
      interleaved: false,
      layers: [],
    });

    map.on("load", () => {
      map.addControl(overlay as unknown as maplibregl.IControl);

      map.addSource("brush-rect", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "brush-rect-fill",
        type: "fill",
        source: "brush-rect",
        paint: { "fill-color": "#0d7680", "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: "brush-rect-line",
        type: "line",
        source: "brush-rect",
        paint: {
          "line-color": "#0d7680",
          "line-width": 2,
          "line-dasharray": [3, 2],
        },
      });

      mapRef.current = map;
      overlayRef.current = overlay;
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  // Rectangle drawing — all in one useEffect with stable refs
  useEffect(() => {
    if (!mapReady || !containerRef.current) return;
    const el = containerRef.current;
    const map = mapRef.current!;

    function updateRectVisual(bounds: Bounds) {
      const source = map.getSource("brush-rect") as maplibregl.GeoJSONSource;
      source?.setData({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [bounds.west, bounds.south],
            [bounds.east, bounds.south],
            [bounds.east, bounds.north],
            [bounds.west, bounds.north],
            [bounds.west, bounds.south],
          ]],
        },
        properties: {},
      });
    }

    function isInsideRect(lng: number, lat: number, rect: Bounds): boolean {
      return lng >= rect.west && lng <= rect.east && lat >= rect.south && lat <= rect.north;
    }

    const onMouseDown = (e: MouseEvent) => {
      const lngLat = map.unproject([e.offsetX, e.offsetY]);

      // Check if clicking inside existing rect → start dragging
      if (currentRectRef.current && isInsideRect(lngLat.lng, lngLat.lat, currentRectRef.current)) {
        e.preventDefault();
        e.stopPropagation();
        map.dragPan.disable();
        map.boxZoom.disable();
        modeRef.current = "dragging";
        dragOffsetRef.current = {
          dLng: lngLat.lng - (currentRectRef.current.west + currentRectRef.current.east) / 2,
          dLat: lngLat.lat - (currentRectRef.current.south + currentRectRef.current.north) / 2,
        };
        startRef.current = { lng: lngLat.lng, lat: lngLat.lat };
        return;
      }

      // Shift+click → start drawing new rect
      if (!e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation();
      map.dragPan.disable();
      map.boxZoom.disable();
      modeRef.current = "drawing";
      startRef.current = { lng: lngLat.lng, lat: lngLat.lat };
      currentRectRef.current = null;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (modeRef.current === "idle" || !startRef.current) return;
      const lngLat = map.unproject([e.offsetX, e.offsetY]);

      if (modeRef.current === "drawing") {
        const bounds: Bounds = {
          west: Math.min(startRef.current.lng, lngLat.lng),
          east: Math.max(startRef.current.lng, lngLat.lng),
          south: Math.min(startRef.current.lat, lngLat.lat),
          north: Math.max(startRef.current.lat, lngLat.lat),
        };
        currentRectRef.current = bounds;
        updateRectVisual(bounds);
      } else if (modeRef.current === "dragging" && currentRectRef.current) {
        const dLng = lngLat.lng - startRef.current.lng;
        const dLat = lngLat.lat - startRef.current.lat;
        const rect = currentRectRef.current;
        const bounds: Bounds = {
          west: rect.west + dLng,
          east: rect.east + dLng,
          south: rect.south + dLat,
          north: rect.north + dLat,
        };
        currentRectRef.current = bounds;
        startRef.current = { lng: lngLat.lng, lat: lngLat.lat };
        updateRectVisual(bounds);
      }
    };

    const onMouseUp = () => {
      if (modeRef.current === "idle") return;
      modeRef.current = "idle";
      map.dragPan.enable();
      map.boxZoom.enable();

      const bounds = currentRectRef.current;
      if (bounds && Math.abs(bounds.east - bounds.west) > 0.001 && Math.abs(bounds.north - bounds.south) > 0.001) {
        setHasBrush(true);
        onBrushRef.current(bounds);
      }

      startRef.current = null;
      dragOffsetRef.current = null;
    };

    // Cursor change when hovering over the rect
    const onHoverCheck = (e: MouseEvent) => {
      if (modeRef.current !== "idle") return;
      const rect = currentRectRef.current;
      if (!rect) {
        map.getCanvas().style.cursor = "";
        return;
      }
      const lngLat = map.unproject([e.offsetX, e.offsetY]);
      if (isInsideRect(lngLat.lng, lngLat.lat, rect)) {
        map.getCanvas().style.cursor = "grab";
      } else {
        map.getCanvas().style.cursor = "";
      }
    };

    el.addEventListener("mousedown", onMouseDown, true);
    el.addEventListener("mousemove", onHoverCheck);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      el.removeEventListener("mousedown", onMouseDown, true);
      el.removeEventListener("mousemove", onHoverCheck);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [mapReady]);

  const clearBrush = useCallback(() => {
    currentRectRef.current = null;
    setHasBrush(false);
    onBrush(null);
    if (mapRef.current) {
      const source = mapRef.current.getSource("brush-rect") as maplibregl.GeoJSONSource;
      source?.setData({ type: "FeatureCollection", features: [] });
    }
  }, [onBrush]);

  // Update deck layers
  useEffect(() => {
    if (!mapReady || !overlayRef.current) return;

    const layers: (ScatterplotLayer | HeatmapLayer)[] = [];

    if (vizMode === "density") {
      layers.push(
        new HeatmapLayer({
          id: "heatmap",
          data: points,
          getPosition: (d: PointData) => [d.lng, d.lat],
          getWeight: 1,
          radiusPixels: 30,
          intensity: 1.2,
          threshold: 0.05,
          colorRange: [
            [255, 255, 178],
            [254, 204, 92],
            [253, 141, 60],
            [240, 59, 32],
            [189, 0, 38],
            [128, 0, 38],
          ],
        })
      );
    } else {
      // Grey background layer for all points (only when filtered)
      if (isFiltered) {
        layers.push(
          new ScatterplotLayer({
            id: "scatter-bg",
            data: allPoints,
            getPosition: (d: PointData) => [d.lng, d.lat],
            getFillColor: [200, 200, 200, 30] as [number, number, number, number],
            getRadius: 30,
            radiusMinPixels: 1.5,
            radiusMaxPixels: 6,
            pickable: false,
            antialiasing: true,
            parameters: { depthWriteEnabled: false },
          })
        );
      }

      // Colored foreground layer for filtered points
      layers.push(
        new ScatterplotLayer({
          id: "scatter",
          data: points,
          getPosition: (d: PointData) => [d.lng, d.lat],
          getFillColor: (d: PointData) => [
            ...(SERVICE_COLORS[d.service_name] || DEFAULT_COLOR),
            200,
          ] as [number, number, number, number],
          getRadius: 30,
          radiusMinPixels: 2,
          radiusMaxPixels: 10,
          opacity: 0.85,
          pickable: true,
          antialiasing: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 100],
          onHover: (info: { object?: PointData; x: number; y: number }) => {
            if (info.object) {
              setTooltip({ x: info.x, y: info.y, data: info.object });
            } else {
              setTooltip(null);
            }
          },
          parameters: { depthWriteEnabled: false },
        })
      );
    }

    overlayRef.current.setProps({ layers });
  }, [points, allPoints, isFiltered, mapReady, vizMode]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x + 12,
            top: tooltip.y - 12,
            zIndex: 20,
            background: "#fff1e5",
            border: "1px solid #ccc1b7",
            borderRadius: 4,
            padding: "8px 12px",
            fontSize: 11,
            fontFamily: "'Space Mono', monospace",
            lineHeight: 1.6,
            pointerEvents: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            maxWidth: 280,
          }}
        >
          <div style={{ fontWeight: 700, color: "#33302e" }}>
            {tooltip.data.service_name}
          </div>
          <div style={{ color: "#66605c" }}>
            {tooltip.data.comm_plan_name || "Unknown neighborhood"}
          </div>
          <div style={{ color: "#807973" }}>{tooltip.data.status}</div>
        </div>
      )}

      {/* Viz mode toggle */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 10,
          display: "flex",
          gap: 2,
          background: "#fff1e5",
          borderRadius: 4,
          padding: 3,
          border: "1px solid #ccc1b7",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}
      >
        {(["dots", "density"] as VizMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setVizMode(mode)}
            style={{
              background: vizMode === mode ? "#33302e" : "transparent",
              border: "none",
              color: vizMode === mode ? "#fff1e5" : "#66605c",
              borderRadius: 4,
              padding: "5px 14px",
              fontSize: 11,
              fontFamily: "'Space Mono', monospace",
              cursor: "pointer",
              textTransform: "capitalize",
              fontWeight: vizMode === mode ? 700 : 400,
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Brush hint / clear */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 12,
          zIndex: 10,
        }}
      >
        {hasBrush ? (
          <button
            onClick={clearBrush}
            style={{
              background: "#fff1e5",
              border: "1px solid #ccc1b7",
              borderRadius: 4,
              padding: "5px 12px",
              fontSize: 11,
              fontFamily: "'Space Mono', monospace",
              color: "#990f3d",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}
          >
            Clear map selection
          </button>
        ) : (
          <div
            style={{
              background: "rgba(255,241,229,0.9)",
              border: "1px solid #ccc1b7",
              borderRadius: 4,
              padding: "5px 10px",
              fontSize: 10,
              fontFamily: "'Space Mono', monospace",
              color: "#807973",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            Shift + drag to select area
          </div>
        )}
      </div>
    </div>
  );
}
