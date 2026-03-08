import { useState, useMemo, useCallback } from "react";
import { DataLayer, GeoFeature, TimeRange } from "../types";

function getTimestamp(feature: GeoFeature, field?: string): number | null {
  if (!field) return null;
  const val = feature.properties[field];
  if (!val) return null;
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? null : d.getTime();
}

export function useTimeFilter(layers: DataLayer[]) {
  const [brushRange, setBrushRange] = useState<TimeRange | null>(null);

  // Compute global time extent across all layers
  const timeExtent = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const layer of layers) {
      if (!layer.timestamp_field) continue;
      for (const f of layer.data) {
        const t = getTimestamp(f, layer.timestamp_field);
        if (t !== null) {
          if (t < min) min = t;
          if (t > max) max = t;
        }
      }
    }
    if (min === Infinity) return null;
    return { start: new Date(min), end: new Date(max) };
  }, [layers]);

  // Build histogram bins for the timeline
  const histogram = useMemo(() => {
    if (!timeExtent) return [];
    const { start, end } = timeExtent;
    const range = end.getTime() - start.getTime();
    const binCount = Math.min(100, Math.max(20, Math.floor(range / (24 * 60 * 60 * 1000))));
    const binSize = range / binCount;

    const bins = Array.from({ length: binCount }, (_, i) => ({
      x0: new Date(start.getTime() + i * binSize),
      x1: new Date(start.getTime() + (i + 1) * binSize),
      counts: {} as Record<string, number>,
      total: 0,
    }));

    for (const layer of layers) {
      if (!layer.timestamp_field) continue;
      for (const f of layer.data) {
        const t = getTimestamp(f, layer.timestamp_field);
        if (t === null) continue;
        const idx = Math.min(
          Math.floor((t - start.getTime()) / binSize),
          binCount - 1
        );
        if (idx >= 0 && idx < binCount) {
          bins[idx].counts[layer.id] = (bins[idx].counts[layer.id] || 0) + 1;
          bins[idx].total += 1;
        }
      }
    }
    return bins;
  }, [layers, timeExtent]);

  // Filter features by brush
  const filteredLayers = useMemo(() => {
    if (!brushRange) return layers;
    const { start, end } = brushRange;
    return layers.map((layer) => {
      if (!layer.timestamp_field) return layer;
      return {
        ...layer,
        data: layer.data.filter((f) => {
          const t = getTimestamp(f, layer.timestamp_field);
          if (t === null) return true;
          return t >= start.getTime() && t <= end.getTime();
        }),
      };
    });
  }, [layers, brushRange]);

  const clearBrush = useCallback(() => setBrushRange(null), []);

  return {
    brushRange,
    setBrushRange,
    clearBrush,
    timeExtent,
    histogram,
    filteredLayers,
  };
}
