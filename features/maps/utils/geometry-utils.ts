import * as turf from "@turf/turf";
import ee from "@google/earthengine";

export const checkGeometryIntersection = (geojson1: any, geojson2: any) => {
  const intersection = turf.booleanIntersects(geojson1, geojson2);
  return intersection;
};

export const calculateGeometryCentroid = (geometry: any) => {
  if (!geometry || !geometry.type) {
    throw new Error("Invalid or missing geometry object.");
  }

  switch (geometry.type) {
    case "Polygon":
    case "MultiPolygon":
    case "FeatureCollection":
      // Use turf.centroid directly
      return turf.centroid(geometry).geometry.coordinates as [number, number];

    case "LineString":
    case "MultiLineString":
      // Calculate midpoint from first to last coordinate
      const line = turf.lineString(geometry.coordinates);
      return turf.midpoint(
        turf.point(line.geometry.coordinates[0]),
        turf.point(
          line.geometry.coordinates[line.geometry.coordinates.length - 1]
        )
      ).geometry.coordinates as [number, number];

    case "Point":
      // Return Point’s coordinates
      return geometry.coordinates as [number, number];

    case "MultiPoint":
      // For MultiPoint, let turf.centroid figure out a representative point
      return turf.centroid(geometry).geometry.coordinates as [number, number];

    default:
      throw new Error(
        "Unsupported geometry type. Supported types: Point, MultiPoint, Polygon, " +
          "MultiPolygon, LineString, MultiLineString, FeatureCollection."
      );
  }
};

export const calculateZoomLevel = (layerGeometry: any) => {
  let boundaryArea;

  if (
    layerGeometry.type === "Polygon" ||
    layerGeometry.type === "MultiPolygon"
  ) {
    boundaryArea = turf.area(layerGeometry);
  } else if (
    layerGeometry.type === "LineString" ||
    layerGeometry.type === "MultiLineString"
  ) {
    // Approximate "area" via length in meters
    boundaryArea = turf.length(layerGeometry, { units: "meters" });
  } else if (
    layerGeometry.type === "Point" ||
    layerGeometry.type === "MultiPoint"
  ) {
    boundaryArea = 1; // minimal area
  } else if (layerGeometry.type === "FeatureCollection") {
    // Create a bounding box polygon for the entire FeatureCollection
    const envelope = turf.envelope(layerGeometry);
    boundaryArea = turf.area(envelope);

    // (If you prefer a different approach, you could sum areas of each feature,
    // or handle lines differently, etc. The envelope approach is simplest.)
  } else {
    throw new Error(
      "Unsupported geometry type. Only Polygon, MultiPolygon, LineString, MultiLineString, Point, MultiPoint, and FeatureCollection are supported."
    );
  }

  // Now apply your “log area -> zoom scale” logic
  const maxZoom = 18;
  const minZoom = 10;
  const areaMax = 1000000000;
  const areaMin = 1000;

  const zoomLevel =
    maxZoom -
    ((Math.log(boundaryArea) - Math.log(areaMin)) /
      (Math.log(areaMax) - Math.log(areaMin))) *
      (maxZoom - minZoom);

  return Math.max(minZoom, Math.min(maxZoom, zoomLevel));
};

export const calculateBoundingBoxCenter = (featureCollection: any) => {
  const bbox = turf.bbox(featureCollection);
  const center = turf.center(turf.bboxPolygon(bbox));
  return center.geometry.coordinates as [number, number];
};

export const calculateEnvelopeCenter = (featureCollection: any) => {
  const envelope = turf.envelope(featureCollection);
  const center = turf.center(envelope);
  return center.geometry.coordinates as [number, number];
};

export const convertFeatureToGeometry = (feature: Feature) => {
  let geometry: string | undefined;
  let coordinates: any;

  // If feature.coordinates already exists
  if (feature?.coordinates) {
    coordinates = feature.coordinates;

    // For a single ring closed feature => Polygon
    if (
      Array.isArray(coordinates) &&
      coordinates.length > 0 &&
      JSON.stringify(coordinates[0]) ===
        JSON.stringify(coordinates[coordinates.length - 1])
    ) {
      geometry = "Polygon";
      coordinates = [coordinates]; // <-- wrap in an array for Polygon
    } else {
      geometry = "LineString";
    }
  } else if (feature?.lat && feature?.lon) {
    const { lat, lon } = feature;

    // lat/lon are arrays => can be LineString or Polygon
    if (Array.isArray(lat) && Array.isArray(lon)) {
      const coords = lat.map((latVal, i) => [lon[i], latVal]);

      if (
        coords.length > 0 &&
        JSON.stringify(coords[0]) === JSON.stringify(coords[coords.length - 1])
      ) {
        geometry = "Polygon";
        coordinates = [coords]; // <-- wrap in an array
      } else {
        geometry = "LineString";
        coordinates = coords;
      }

      // Single lat/lon => Point
    } else {
      geometry = "Point";
      coordinates = [lon, lat];
    }
  }

  return {
    type: geometry,
    coordinates,
  };
};

export const calculateGeometryArea = (geometry: any) => {
  const area = turf.area(geometry);
  const areaInKm2 = turf.convertArea(area, "meters", "kilometers");
  return areaInKm2;
};

export const checkGeometryAreaIsLessThanThreshold = (
  geometry: any,
  threshold: number // in square kilometers
) => {
  const area = calculateGeometryArea(geometry);
  return area < threshold;
};

export function convertToEeGeometry(geometry: any) {
  if (
    geometry.type === "FeatureCollection" &&
    Array.isArray(geometry.features)
  ) {
    if (geometry.features.length === 1) {
      return ee.Geometry(geometry.features[0].geometry);
    }

    const multiPolygonCoordinates = geometry.features.map((feature: any) => {
      if (!feature.geometry || !feature.geometry.coordinates) {
        throw new Error("Invalid feature geometry provided.");
      }
      return feature.geometry.coordinates;
    });
    return ee.Geometry.MultiPolygon(multiPolygonCoordinates);
  }

  if (geometry.type === "Feature" && geometry.geometry) {
    return ee.Geometry(geometry.geometry);
  }

  return ee.Geometry(geometry);
}

export function convertEeGeometryToGeoJSON(eeGeom: any) {
  // If eeGeom.type_ === 'Polygon', transform it to GeoJSON
  if (eeGeom.type_ === "Polygon" && eeGeom.coordinates_) {
    return {
      type: "Polygon",
      coordinates: eeGeom.coordinates_,
    };
  }
  // Extend this if you handle other geometry types (Point, MultiPolygon, etc.)
  throw new Error("Unsupported geometry type or invalid EE geometry.");
}

export function convertCoordinatesToGeoJson(coordinates: {
  lat: number;
  lon: number;
}) {
  return turf.point([coordinates.lon, coordinates.lat]);
}

export function convertToNDecimals(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

function flattenPolygonCoordinates(coords?: number[][][]): number[][] {
  if (!coords) return [];
  return coords.flatMap((ring) => ring);
}
