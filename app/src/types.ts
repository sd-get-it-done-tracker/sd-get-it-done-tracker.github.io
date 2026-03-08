export interface GeoFeature {
  type: "Feature";
  geometry: {
    type: "Point" | "Polygon" | "MultiPolygon" | "LineString";
    coordinates: number[] | number[][] | number[][][] | number[][][][];
  };
  properties: Record<string, unknown>;
}

export interface GeoFeatureCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
}

export interface DataLayer {
  id: string;
  label: string;
  visible: boolean;
  color: [number, number, number, number];
  data: GeoFeature[];
  source: "api" | "mcp";
  endpoint?: string;
  timestamp_field?: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface FilterState {
  timeRange: TimeRange | null;
  layers: string[];
  neighborhoods: string[];
}
