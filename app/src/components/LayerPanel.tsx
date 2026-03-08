import { DataLayer } from "../types";
import { SD_DATASETS } from "../hooks/useDataLayers";

interface Props {
  layers: DataLayer[];
  loading: Record<string, boolean>;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onFetch: (key: string) => void;
}

export default function LayerPanel({
  layers,
  loading,
  onToggle,
  onRemove,
  onFetch,
}: Props) {
  const loadedIds = new Set(layers.map((l) => l.id));

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 10,
        background: "rgba(20, 22, 28, 0.92)",
        backdropFilter: "blur(12px)",
        borderRadius: 12,
        padding: 16,
        width: 260,
        color: "#e0e0e0",
        fontSize: 13,
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, color: "#fff" }}>
        SD Neighborhood Tracker
      </div>

      <div style={{ fontSize: 11, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
        Data Sources
      </div>

      {Object.entries(SD_DATASETS).map(([key, ds]) => {
        const loaded = loadedIds.has(ds.id);
        const isLoading = loading[ds.id];
        return (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 0",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: `rgb(${ds.color[0]},${ds.color[1]},${ds.color[2]})`,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1 }}>{ds.label}</span>
            {isLoading ? (
              <span style={{ fontSize: 11, color: "#888" }}>loading...</span>
            ) : loaded ? (
              <span style={{ fontSize: 11, color: "#6c6" }}>
                {layers.find((l) => l.id === ds.id)?.data.length ?? 0}
              </span>
            ) : (
              <button
                onClick={() => onFetch(key)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#ccc",
                  borderRadius: 6,
                  padding: "2px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Load
              </button>
            )}
          </div>
        );
      })}

      {layers.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: "#888", marginTop: 14, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
            Active Layers
          </div>
          {layers.map((layer) => (
            <div
              key={layer.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 0",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => onToggle(layer.id)}
                  style={{ accentColor: `rgb(${layer.color[0]},${layer.color[1]},${layer.color[2]})` }}
                />
                <span style={{ opacity: layer.visible ? 1 : 0.5 }}>
                  {layer.label}
                </span>
              </label>
              <button
                onClick={() => onRemove(layer.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#666",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: "0 4px",
                }}
                title="Remove layer"
              >
                x
              </button>
            </div>
          ))}
        </>
      )}

      <div style={{ fontSize: 10, color: "#555", marginTop: 14 }}>
        Source: data.sandiego.gov
      </div>
    </div>
  );
}
