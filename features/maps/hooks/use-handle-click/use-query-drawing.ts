"use client";

import { useEffect } from "react";
import { Map } from "maplibre-gl";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import * as turf from "@turf/turf";

import useLoadingStore from "@/stores/use-loading-store";
import useToastMessageStore from "@/stores/use-toast-message-store";

import useQueryStore from "@/features/maps/stores/map-queries-stores/useQueryReadyStore";
import useDrawnFeatureOnMapStore from "@/features/maps/stores/use-drawn-feature-on-map-store";
import { addDrawnLayerToMap } from "@/features/maps/utils/add-drawn-layer-to-map";
import { checkGeometryIntersection } from "@/features/maps/utils/geometry-utils";
import projectConfigs from "@/custom-configs/project-config";

import { extractValuesFromGeeMap } from "@/lib/geospatial/gee/extract-values-from-gee-layer/extract-values-from-gee-layer";
import { dateToString } from "@/utils/general/general-utils";
import { calculateGeometryArea } from "@/features/maps/utils/geometry-utils";

import useFunctionStore from "@/features/maps/stores/use-function-store";
import useLayerSelectionStore from "@/features/maps/stores/use-layer-selection-store";
import { useButtonsStore } from "@/stores/use-buttons-store";
import usePlotReadyDataFromVectorLayerStore from "@/features/maps/stores/plots-stores/usePlotReadyFromVectorLayerStore";
import { useGeeOutputStore } from "../../stores/use-gee-ouput-store";
import useROIStore from "../../stores/use-roi-store";
import { generateUUID } from "@/features/chat/utils/general-utils";
import { formatQueryForTable } from "../../utils/other-utils";

interface UseQueryDrawingProps {
  map: Map | null;
  drawRef: React.RefObject<MapboxDraw | null>;
}

/**
 * Consolidates the logic for BOTH query polygon drawing and query point drawing.
 */
export default function useQueryDrawing({
  map,
  drawRef,
}: UseQueryDrawingProps) {
  const { setLoading } = useLoadingStore();
  const { setToastMessage } = useToastMessageStore();
  const { queryReady, setQueryReady } = useQueryStore();
  const { addDrawnFeatureOnMap } = useDrawnFeatureOnMapStore();

  const { getFunctionConfig, getFunctionTypeByLayerName } = useFunctionStore();
  const { selectedRasterLayer } = useLayerSelectionStore();

  const setPlotReadyDataForSelectedAreaOnMap =
    usePlotReadyDataFromVectorLayerStore(
      (state) => state.setPlotReadyDataForSelectedAreaOnMap
    );

  const getTempCreatedMapInAssetsPath = useGeeOutputStore(
    (state) => state.getTempCreatedMapInAssetsPath
  );
  const activeDrawingMode = useButtonsStore((state) => state.activeDrawingMode);
  const setActiveDrawingMode = useButtonsStore((state) => state.setDrawingMode);

  const isROIDrawingActive = useROIStore((state) => state.isROIDrawingActive);

  /**
   * (A) Handle query polygon drawing
   */
  useEffect(() => {
    // If ROI drawing is active or not in polygon draw mode, skip
    if (
      !map ||
      !drawRef.current ||
      isROIDrawingActive ||
      activeDrawingMode !== "draw_polygon"
    )
      return;

    const handlePolygonDrawCreate = async (event: any) => {
      setLoading(true);
      setQueryReady(false);

      const polygonFeature = event.features[0];
      const geometry = polygonFeature.geometry;

      try {
        const config = getFunctionConfig(selectedRasterLayer.layerName);

        // 1) Validate geometry intersection with ROI or default boundary
        const useSelectedRoi = config?.selectedRoiGeometry; // object or null
        if (!useSelectedRoi) {
          drawRef.current?.deleteAll();
          return;
        }
        const intersectionOK = checkGeometryIntersection(
          geometry,
          useSelectedRoi
        );
        if (!intersectionOK) {
          setToastMessage("Selected area is outside the boundary.", "error");
          drawRef.current?.deleteAll();
          setLoading(false);
          return;
        }

        // 3) Call GEE to extract values
        const outputsFromMap = await extractValuesFromGeeMap({
          functionType: config?.functionType!,
          tempCreatedMapInAsset: getTempCreatedMapInAssetsPath(
            selectedRasterLayer.layerName
          ),
          analysisOptions: config?.multiAnalysisOptions!,
          aggregationMethod: config?.aggregationMethod!,
          geojsonFeature: geometry,
          startDate1:
            typeof config?.startDate === "string"
              ? config.startDate
              : dateToString(config?.startDate!),
          endDate1:
            typeof config?.endDate === "string"
              ? config.endDate
              : dateToString(config?.endDate!),
          startDate2:
            config?.startDate2 && typeof config?.startDate2 === "string"
              ? config.startDate2
              : dateToString(config?.startDate2!),
          endDate2:
            config?.endDate2 && typeof config?.endDate2 === "string"
              ? config.endDate2
              : dateToString(config?.endDate2!),
        });

        const description = `<strong>Layer</strong>: ${
          selectedRasterLayer.layerName
        }<br>
        <strong>Query result</strong>: ${formatQueryForTable(outputsFromMap)}`;

        // Build a valid GeoJSON FeatureCollection
        const geojsonData = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: geometry,
              properties: {
                description,
              },
            },
          ],
        };
        const featureId = `query_${generateUUID()}`; // or a random ID
        // 2) Add geometry as a drawn layer on map
        addDrawnLayerToMap(map, geojsonData, featureId);

        // 5) Store result in plot store
        setPlotReadyDataForSelectedAreaOnMap(
          {
            outputsFromMap,
            vectorLayerName: "",
            selectedFeature: "",
          },
          config?.functionType || ""
        );

        // 3) Store in "drawnFeaturesOnMap"
        addDrawnFeatureOnMap({
          featureLayerName: featureId,
          geometry: "Polygon",
          coordinates: geometry.coordinates,
          rasterLayerName: selectedRasterLayer.layerName,
          query: outputsFromMap,
        });

        // Clear from MapboxDraw’s memory
        drawRef.current?.deleteAll();

        setQueryReady(true);
      } catch (error) {
        console.error(error);
      } finally {
        // Return to simple_select mode
        setActiveDrawingMode("simple_select");
        setLoading(false);
      }
    };

    map.on("draw.create", handlePolygonDrawCreate);

    return () => {
      map.off("draw.create", handlePolygonDrawCreate);
    };
  }, [map, drawRef, activeDrawingMode]);

  /**
   * (B) Handle query point drawing
   *    In your existing code, you’re using `map.on("click", ...)` approach for points
   */
  useEffect(() => {
    // If ROI drawing is active or not in point draw mode, skip
    if (!map || activeDrawingMode !== "draw_point" || isROIDrawingActive)
      return;

    const handleClick = async (event: maplibregl.MapMouseEvent) => {
      setLoading(true);
      setQueryReady(false);

      const { lng: lon, lat } = event.lngLat;
      const geojsonCoords = turf.point([lon, lat]).geometry;

      try {
        const config = getFunctionConfig(selectedRasterLayer.layerName);
        const useSelectedRoi = config?.selectedRoiGeometry;

        if (!useSelectedRoi) {
          drawRef.current?.deleteAll();
          return;
        }

        // 1) Validate geometry intersection with ROI or default boundary
        const intersectionOK = checkGeometryIntersection(
          geojsonCoords,
          useSelectedRoi
        );
        if (!intersectionOK) {
          setToastMessage("Selected area is outside the boundary.", "error");
          drawRef.current?.deleteAll();
          setQueryReady(true);
          setLoading(false);
          return;
        }

        // 2) Extract values from GEE
        const outputsFromMap = await extractValuesFromGeeMap({
          functionType: config?.functionType!,
          aggregationMethod: config?.aggregationMethod!,
          analysisOptions: config?.multiAnalysisOptions!,
          tempCreatedMapInAsset: getTempCreatedMapInAssetsPath(
            selectedRasterLayer.layerName
          ),
          geojsonFeature: geojsonCoords,
          startDate1:
            typeof config?.startDate === "string"
              ? config.startDate
              : dateToString(config?.startDate!),
          endDate1:
            typeof config?.endDate === "string"
              ? config.endDate
              : dateToString(config?.endDate!),
          startDate2:
            config?.startDate2 && typeof config?.startDate2 === "string"
              ? config.startDate2
              : dateToString(config?.startDate2!),
          endDate2:
            config?.endDate2 && typeof config?.endDate2 === "string"
              ? config.endDate2
              : dateToString(config?.endDate2!),
        });

        const description = `<strong>Layer</strong>: ${
          selectedRasterLayer.layerName
        }<br>
        <strong>Query result</strong>: ${formatQueryForTable(outputsFromMap)}`;

        // Build a valid GeoJSON FeatureCollection
        const geojsonData = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: geojsonCoords,
              properties: {
                description,
              },
            },
          ],
        };

        const pointFeatureId = `query_${generateUUID()}`; // or a random ID
        addDrawnLayerToMap(map, geojsonData, pointFeatureId);

        // 3) Store result
        setPlotReadyDataForSelectedAreaOnMap(
          {
            outputsFromMap,
            vectorLayerName: "",
            selectedFeature: "",
          },
          config?.functionType || ""
        );

        // 4) Store as a drawn feature
        addDrawnFeatureOnMap({
          featureLayerName: pointFeatureId,
          geometry: "Point",
          lat,
          lon,
          rasterLayerName: selectedRasterLayer.layerName,
          query: outputsFromMap,
        });

        drawRef.current?.deleteAll();

        setQueryReady(true);
      } catch (error) {
        console.error(error);
      } finally {
        // Return to simple_select mode
        setActiveDrawingMode("simple_select");
        setLoading(false);
      }
    };

    map.on("click", handleClick);

    return () => {
      map.off("click", handleClick);
    };
  }, [map, activeDrawingMode]);

  return null; // No return needed unless you want to expose state
}
