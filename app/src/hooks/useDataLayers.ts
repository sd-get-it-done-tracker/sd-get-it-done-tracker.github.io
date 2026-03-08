import { useState, useCallback } from "react";
import { DataLayer, GeoFeature, GeoFeatureCollection } from "../types";

const SOCRATA_BASE = "https://data.sandiego.gov/resource";

// San Diego Open Data Portal dataset endpoints
export const SD_DATASETS = {
  get_it_done_311: {
    id: "get_it_done_311",
    endpoint: `${SOCRATA_BASE}/pygq-kfcb.json`,
    label: "Get It Done (311)",
    color: [255, 140, 0, 180] as [number, number, number, number],
    timestamp_field: "date_requested",
  },
  code_enforcement: {
    id: "code_enforcement",
    endpoint: `${SOCRATA_BASE}/cin7-eycw.json`,
    label: "Code Enforcement",
    color: [220, 50, 50, 180] as [number, number, number, number],
    timestamp_field: "date_case_created",
  },
  police_calls: {
    id: "police_calls",
    endpoint: `${SOCRATA_BASE}/v683-d8qq.json`,
    label: "Police Calls for Service",
    color: [50, 100, 220, 180] as [number, number, number, number],
    timestamp_field: "date_time",
  },
};

function toGeoFeatures(
  rows: Record<string, unknown>[],
  latField = "lat",
  lngField = "lng"
): GeoFeature[] {
  return rows
    .filter((r) => r[latField] != null && r[lngField] != null)
    .map((r) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [Number(r[lngField]), Number(r[latField])],
      },
      properties: r,
    }));
}

export function useDataLayers() {
  const [layers, setLayers] = useState<DataLayer[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const fetchLayer = useCallback(
    async (
      datasetKey: keyof typeof SD_DATASETS,
      limit = 5000,
      where?: string
    ) => {
      const ds = SD_DATASETS[datasetKey];
      setLoading((prev) => ({ ...prev, [ds.id]: true }));

      try {
        const params = new URLSearchParams({
          $limit: String(limit),
          ...(where ? { $where: where } : {}),
        });
        const res = await fetch(`${ds.endpoint}?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows: Record<string, unknown>[] = await res.json();
        const features = toGeoFeatures(rows);

        const layer: DataLayer = {
          id: ds.id,
          label: ds.label,
          visible: true,
          color: ds.color,
          data: features,
          source: "api",
          endpoint: ds.endpoint,
          timestamp_field: ds.timestamp_field,
        };

        setLayers((prev) => {
          const idx = prev.findIndex((l) => l.id === ds.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = layer;
            return next;
          }
          return [...prev, layer];
        });

        return layer;
      } catch (err) {
        console.error(`Failed to fetch ${ds.label}:`, err);
        return null;
      } finally {
        setLoading((prev) => ({ ...prev, [ds.id]: false }));
      }
    },
    []
  );

  const addMCPLayer = useCallback(
    (id: string, label: string, geojson: GeoFeatureCollection, color: [number, number, number, number], timestampField?: string) => {
      const layer: DataLayer = {
        id,
        label,
        visible: true,
        color,
        data: geojson.features,
        source: "mcp",
        timestamp_field: timestampField,
      };
      setLayers((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = layer;
          return next;
        }
        return [...prev, layer];
      });
    },
    []
  );

  const toggleLayer = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  }, []);

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return { layers, loading, fetchLayer, addMCPLayer, toggleLayer, removeLayer };
}
