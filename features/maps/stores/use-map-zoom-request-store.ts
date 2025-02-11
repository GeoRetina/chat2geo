import { create } from "zustand";
import useROIStore from "./use-roi-store";
import useMapLayersStore from "./use-map-layer-store";

export interface AddressSearchProps {
  lat: number;
  lng: number;
}

interface ZoomInLayerState {
  zoomToLayerRequestWithGeometry: ROIGeometry | null;
  setZoomToLayerRequestWithGeometry: (layerName: string | null) => void;

  zoomToAddressRequest: AddressSearchProps | null;
  setZoomToAddressRequest: (coordinates: AddressSearchProps | null) => void;

  zoomRequestFromTable: Feature | null;
  setZoomRequestFromTable: (feature: Feature | null) => void;

  // Reset method to revert the store to initial state
  reset: () => void;
}

// Define the initial defaults for easy reference
const initialState = {
  zoomToLayerRequestWithGeometry: null as ROIGeometry | null,
  zoomToAddressRequest: null as AddressSearchProps | null,
  zoomRequestFromTable: null as Feature | null,
};

const useZoomRequestStore = create<ZoomInLayerState>((set) => ({
  ...initialState,

  setZoomRequestFromTable: (feature) => {
    set({ zoomRequestFromTable: feature });
  },

  setZoomToLayerRequestWithGeometry: (layerName) => {
    // Clear any existing geometry
    set({ zoomToLayerRequestWithGeometry: null });
    if (!layerName) {
      return;
    }
    const getLayerPropertiesByName =
      useMapLayersStore.getState().getLayerPropertiesByName;
    const mapLayer = getLayerPropertiesByName(layerName);

    const isLayerTypeROI = mapLayer?.layerType === "roi";

    let roiName = "";
    if (isLayerTypeROI) {
      roiName = layerName;
    } else {
      roiName = mapLayer?.roiName || "";
    }

    const geometry = useROIStore.getState().getRoiGeometryByName(roiName);

    set({ zoomToLayerRequestWithGeometry: geometry });
  },

  // Setter for zoomToAddressRequest using AddressSearchProps
  setZoomToAddressRequest: (coordinates) => {
    set({ zoomToAddressRequest: coordinates });
  },

  // Reset method to revert the store to initial state
  reset: () => {
    set({ ...initialState });
  },
}));

export default useZoomRequestStore;
