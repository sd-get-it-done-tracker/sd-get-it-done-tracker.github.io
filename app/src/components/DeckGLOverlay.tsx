import { useControl } from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";

export function DeckGLOverlay(props: Record<string, unknown>) {
  const overlay = useControl(() => new MapboxOverlay({}));
  overlay.setProps(props);
  return null;
}
