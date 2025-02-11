import { create } from "zustand";
import { useGeeOutputStore } from "./use-gee-ouput-store";
import useROIStore from "./use-roi-store";
import maplibregl from "maplibre-gl";
import { checkLayerName } from "../utils/general-checks";
import { isQueryUuid } from "@/features/chat/utils/general-utils";

interface MapLayersState {
  mapCurrent: maplibregl.Map | null;
  setMapCurrent: (mapInstance: maplibregl.Map | null) => void;
  mapLoaded: boolean;
  setMapLoaded: (loaded: boolean) => void;
  mapLayers: MapLayer[];
  addMapLayer: (layer: MapLayer) => void;
  removeMapLayer: (id: string) => void;
  removeLayerSignal: string | null;

  getMapLayersLength: () => number;
  getMapLayer: (index: number) => MapLayer | undefined;
  toggleMapLayerVisibility: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  getLayerPropertiesByName: (id: string) => {
    layerOpacity: number;
    layerType: string;
    roiName: string | null;
    uhiMetrics: UHIMetrics | null;
    layerFunctionType?: string;
  } | null;
  getMapStats: (layerName: string) => Record<string, any> | undefined;
  reorderLayers: (newOrder: string[]) => void;
  getMapLayerNames: () => string[];
  reset: () => void;
}

// Define the initial state explicitly, so it's easy to reuse in `reset`
const initialState = {
  mapCurrent: null as maplibregl.Map | null,
  mapLoaded: false,
  mapLayers: [] as MapLayer[],
  removeLayerSignal: null as string | null,
};

const useMapLayersStore = create<MapLayersState>((set, get) => ({
  // Spread the initial state properties
  ...initialState,

  setMapCurrent: (mapInstance) => set({ mapCurrent: mapInstance }),

  setMapLoaded: (loaded) => set({ mapLoaded: loaded }),

  addMapLayer: (layer) =>
    set((state) => {
      // 1) Check if a layer with the same `id` + `type` already exists
      const existingLayer = state.mapLayers.find(
        (l) => l.id === layer.id && l.type === layer.type
      );
      if (existingLayer) {
        // If found, skip adding
        return state;
      }

      // 2) Otherwise, continue with the rest of your logic (unique naming, etc.)
      const allLayerNames = state.mapLayers.map((l) => l.name);
      const uniqueName = checkLayerName(layer.name, allLayerNames);

      // Create a new layer object with the updated (or unchanged) name
      const newLayer = { ...layer, name: uniqueName };

      return {
        mapLayers: [...state.mapLayers, newLayer],
      };
    }),

  removeMapLayer: (name: string) => {
    const removeGeeLayer = useGeeOutputStore.getState().removeGeeLayer;
    const { mapCurrent, mapLayers, removeLayerSignal } = get();
    const map = mapCurrent;

    if (!map) return;

    const layerToRemove = mapLayers.find((layer) => layer.name === name);

    if (!layerToRemove) return;

    // Determine if this is an ROI layer (uses "_roi") or not
    const isRoiLayer = layerToRemove.type === "roi";
    // The actual name for the Mapbox layer
    const mapLayerName = isRoiLayer ? `${name}_roi` : name;

    // --- Remove main layer ---
    if (map.getLayer(mapLayerName)) {
      map.removeLayer(mapLayerName);
    }

    // --- If it's an ROI layer, remove the border layer as well ---
    if (isRoiLayer) {
      const borderLayerName = `${name}_roi-border`;
      if (map.getLayer(borderLayerName)) {
        map.removeLayer(borderLayerName);
      }
    }

    // --- Remove the underlying source ---
    // • For ROI: source is `${name}_roi`
    // • For raster: source is `name`
    const mapSourceName = isRoiLayer ? `${name}_roi` : name;
    if (map.getSource(mapSourceName)) {
      map.removeSource(mapSourceName);
    }

    // --- Update Zustand state to remove it from mapLayers ---
    set((state) => ({
      mapLayers: state.mapLayers.filter((layer) => layer.name !== name),
      removeLayerSignal: name,
    }));

    if (isRoiLayer) {
      useROIStore.getState().removeRoiGeometry(name);
    } else {
      removeGeeLayer(name);
      if (removeLayerSignal === name) {
        setTimeout(() => {
          set({ removeLayerSignal: name });
        }, 1000);
      }
    }
  },

  getMapLayersLength: () => get().mapLayers.length,

  getMapLayer: (index: number) => get().mapLayers[index],

  toggleMapLayerVisibility: (name: string) =>
    set((state) => {
      const map = get().mapCurrent;
      const updatedLayers = state.mapLayers.map((layer) => {
        if (layer.name === name) {
          let layerName = layer.name;
          if (layer.type === "roi") {
            layerName = `${layer.name}_roi`;
          }
          const newVisibility = !layer.visible;
          if (map && map.getLayer(layerName)) {
            map.setLayoutProperty(
              layerName,
              "visibility",
              newVisibility ? "visible" : "none"
            );
          }

          const borderLayerId = `${layerName}-border`;
          if (map && map.getLayer(borderLayerId)) {
            map.setLayoutProperty(
              borderLayerId,
              "visibility",
              newVisibility ? "visible" : "none"
            );
          }

          return { ...layer, visible: newVisibility };
        }
        return layer;
      });

      return { mapLayers: updatedLayers };
    }),

  setLayerOpacity: (name: string, opacity: number) =>
    set((state) => ({
      mapLayers: state.mapLayers.map((layer) =>
        layer.name === name ? { ...layer, layerOpacity: opacity } : layer
      ),
    })),

  getLayerPropertiesByName: (name: string) => {
    const layer = get().mapLayers.find((layer) => layer.name === name);
    return layer
      ? {
          layerOpacity: layer.layerOpacity ?? 0.8,
          layerType: layer.type,
          roiName: layer.roiName,
          uhiMetrics: layer.uhiMetrics ?? null,
          layerFunctionType: layer.layerFunctionType,
        }
      : null;
  },

  getMapStats: (layerName: string) => {
    const layer = get().mapLayers.find((layer) => layer.name === layerName);
    return layer ? layer.mapStats : undefined;
  },

  reorderLayers: (newOrder: string[]) => {
    const map = get().mapCurrent;
    if (!map) return;

    // 2a) Update Zustand mapLayers order
    const currentLayers = get().mapLayers;
    const reorderedLayers = newOrder
      .map((layerName) =>
        currentLayers.find((layer) => layer.name === layerName)
      )
      .filter(Boolean) as MapLayer[];

    set({ mapLayers: reorderedLayers });

    // 2b) Move those store-layers in the map
    //     from top -> bottom so the last is visually on top
    for (let i = reorderedLayers.length - 1; i >= 0; i--) {
      const layer = reorderedLayers[i];
      const nextLayer = reorderedLayers[i + 1];

      const mapLayerName =
        layer.type === "roi" ? `${layer.name}_roi` : layer.name;

      let beforeLayerName: string | undefined;
      if (nextLayer) {
        beforeLayerName =
          nextLayer.type === "roi"
            ? `${nextLayer.name}_roi-border`
            : nextLayer.name;
      }

      try {
        if (map.getLayer(mapLayerName)) {
          map.moveLayer(mapLayerName, beforeLayerName);

          // Move a possible border layer above its main layer
          const borderLayerName = `${mapLayerName}-border`;
          if (map.getLayer(borderLayerName)) {
            map.moveLayer(borderLayerName);
          }
        }
      } catch (error) {
        console.error(`Failed to move layer ${mapLayerName}:`, error);
      }
    }

    // 3) Now handle "query_UUID" layers
    //    (those that do NOT live in your Zustand store)
    const styleLayers = map.getStyle().layers;
    if (styleLayers) {
      // a) Move only the layers matching "query_ + valid UUID" above the store-layers,
      //    but below gl-draw.
      const queryLayers = styleLayers.filter((l) => isQueryUuid(l.id));
      queryLayers.forEach((qlayer) => {
        try {
          // Calling moveLayer with NO second argument places it on top of all layers
          // that have already been positioned so far. We'll handle gl-draw next
          // so those remain truly at the top.
          map.moveLayer(qlayer.id);
        } catch (error) {
          console.error(`Failed to move query layer ${qlayer.id}:`, error);
        }
      });

      // b) Finally, ensure all gl-draw layers remain on top
      const drawLayers = styleLayers.filter((l) => l.id.startsWith("gl-draw"));
      drawLayers.forEach((drawLayer) => {
        try {
          map.moveLayer(drawLayer.id);
        } catch (error) {
          console.error(`Failed to move gl-draw layer ${drawLayer.id}:`, error);
        }
      });
    }
  },

  getMapLayerNames: () => get().mapLayers.map((layer) => layer.name),

  // Reset method to revert all relevant state to initial defaults
  reset: () => {
    set({ ...initialState });
  },
}));

export default useMapLayersStore;
