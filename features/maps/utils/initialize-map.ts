import maplibregl from "maplibre-gl";

export const initializeMap = (containerId: string): maplibregl.Map => {
  return new maplibregl.Map({
    container: containerId,
    attributionControl: false,

    style: {
      version: 8,
      sources: {
        "google-satellite-imagery": {
          type: "raster",
          tiles: [
            "/api/services/google-maps/basemaps/satellite?z={z}&x={x}&y={y}",
          ],
          tileSize: 256,
        },
        "osm-tiles": {
          type: "raster",
          tiles: [
            "/api/services/google-maps/basemaps/roadmap?z={z}&x={x}&y={y}",
          ],
          tileSize: 256,
        },
      },
      layers: [
        {
          id: "googleSatelliteImagery",
          type: "raster",
          source: "google-satellite-imagery",
          minzoom: 0,
          maxzoom: 24,
          layout: {
            visibility: "visible",
          },
        },
        {
          id: "googleRoadmap",
          type: "raster",
          source: "osm-tiles",
          minzoom: 0,
          maxzoom: 24,
          layout: {
            visibility: "none",
          },
        },
      ],
    },

    center: [-76.493, 44.2334],
    zoom: 2,
    pitch: 0,
    bearing: 0,
    antialias: true,
  });
};
