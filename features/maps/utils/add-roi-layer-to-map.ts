import { Map, Popup } from "maplibre-gl";
import useColorPickerStore from "@/features/maps/stores/use-color-picker-store";

function getRandomBrightColor(): string {
  let hue;
  do {
    hue = Math.floor(Math.random() * 360);
  } while (hue >= 60 && hue <= 90);

  const saturation = 85 + Math.random() * 15;
  const lightness = 45 + Math.random() * 15;

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export const addRoiLayerToMap = async (
  map: Map,
  geojsonData: any,
  layerName: string
) => {
  const { setPickedColor } = useColorPickerStore.getState();
  let randomColor = getRandomBrightColor();
  if (layerName === "drawnPolygon") {
    randomColor = "yellow";
  }

  // Remove existing layers/sources with the same name
  if (map.getSource(layerName)) {
    const layers = map.getStyle().layers || [];
    layers.forEach((layer) => {
      if (layer.id === layerName || layer.id.startsWith(`${layerName}-`)) {
        if (map.getLayer(layer.id)) {
          map.removeLayer(layer.id);
        }
      }
    });
    map.removeSource(layerName);
  }

  // Add the new GeoJSON source
  map.addSource(layerName, {
    type: "geojson",
    data: geojsonData,
  });

  // Determine geometry type
  const geometryType =
    geojsonData.features?.[0]?.geometry?.type || geojsonData?.type;

  let isPoint = false;
  let isPolygon = false;
  let isLine = false;

  if (geometryType === "Point" || geometryType === "MultiPoint") {
    isPoint = true;
  } else if (geometryType === "Polygon" || geometryType === "MultiPolygon") {
    isPolygon = true;
  } else if (
    geometryType === "LineString" ||
    geometryType === "MultiLineString"
  ) {
    isLine = true;
  }

  // Add layers based on geometry type
  if (isPoint) {
    map.addLayer({
      id: layerName,
      type: "circle",
      source: layerName,
      paint: {
        "circle-radius": 6,
        "circle-color": randomColor,
        "circle-opacity": 0.8,
        "circle-stroke-color": "#4d4d4d",
        "circle-stroke-width": 2,
      },
    });
  } else if (isPolygon) {
    map.addLayer({
      id: `${layerName}-border`,
      type: "line",
      source: layerName,
      paint: {
        "line-color": randomColor,
        "line-width": 3.5,
        "line-opacity": 1,
      },
    });
  } else if (isLine) {
    map.addLayer({
      id: layerName,
      type: "line",
      source: layerName,
      paint: {
        "line-color": randomColor,
        "line-width": 4,
        "line-opacity": 1,
      },
    });
  } else {
    // Fallback: treat unknown geometry as a line
    map.addLayer({
      id: layerName,
      type: "line",
      source: layerName,
      paint: {
        "line-color": randomColor,
        "line-width": 4,
        "line-opacity": 1,
      },
    });
  }

  // Store the picked color if it's not a special case
  if (layerName !== "geocodedPoint") {
    setPickedColor(randomColor, layerName);
  }
};
