import { Map } from "maplibre-gl";

export const addGeocodedPointToMap = async (
  map: Map,
  geojsonData: any,
  layerName: string
) => {
  // Remove any existing source and its associated layers with the same layerName.
  if (map.getSource(layerName)) {
    const existingLayers = map.getStyle().layers || [];
    existingLayers.forEach((layer) => {
      if (layer.id === layerName || layer.id.startsWith(`${layerName}-`)) {
        if (map.getLayer(layer.id)) {
          map.removeLayer(layer.id);
        }
      }
    });
    map.removeSource(layerName);
  }

  console.log("Adding geocoded point to map:", geojsonData);
  // Add the new GeoJSON source.
  map.addSource(layerName, {
    type: "geojson",
    data: geojsonData,
  });

  // Determine the geometry type from the GeoJSON.
  const geometryType = geojsonData?.geometry?.type;

  let isPoint = false;
  if (geometryType === "Point") {
    isPoint = true;
  }

  // Add a circle layer for a point geometry.
  if (isPoint) {
    map.addLayer({
      id: layerName,
      type: "circle",
      source: layerName,
      paint: {
        "circle-radius": 7,
        "circle-color": "yellow",
        "circle-opacity": 0.8,
        // Smooth transition for the opacity change.
        "circle-opacity-transition": { duration: 800, delay: 0 } as any,
        // Set the stroke color to blue.
        "circle-stroke-color": "blue",
        "circle-stroke-width": 2,
        "circle-stroke-opacity": 1,
        "circle-stroke-opacity-transition": { duration: 800, delay: 0 } as any,
      },
    } as any);
  }

  // If the geometry is a point, create a flashing effect for both the inner circle and its border.
  if (isPoint) {
    let visible = true;
    const flashInterval = setInterval(() => {
      visible = !visible;
      // Update both the inner circle and the stroke opacities.
      map.setPaintProperty(layerName, "circle-opacity", visible ? 1 : 0.2);
      map.setPaintProperty(
        layerName,
        "circle-stroke-opacity",
        visible ? 1 : 0.2
      );
    }, 1000);

    // After 10 seconds, clear the flashing and remove the layer and source.
    setTimeout(() => {
      clearInterval(flashInterval);
      if (map.getLayer(layerName)) {
        map.removeLayer(layerName);
      }
      if (map.getSource(layerName)) {
        map.removeSource(layerName);
      }
    }, 10000);
  }
};
