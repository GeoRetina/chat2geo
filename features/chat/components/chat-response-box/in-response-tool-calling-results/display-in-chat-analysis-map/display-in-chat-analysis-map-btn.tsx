import React from "react";
import { IconMap } from "@tabler/icons-react";
import useMapDisplayStore from "@/features/maps/stores/use-map-display-store";
import useLayerSelectionStore from "@/features/maps/stores/use-layer-selection-store";
import useZoomRequestStore from "@/features/maps/stores/use-map-zoom-request-store";
import useMapLayersStore from "@/features/maps/stores/use-map-layer-store";

const DisplayInChatAnalysisMapBtn = ({
  analysisLayerName,
}: {
  analysisLayerName: string;
}) => {
  // 1) Grab your “selectedRasterLayer” setter
  const selectedRasterLayer = useLayerSelectionStore(
    (state) => state.selectedRasterLayer
  );
  const setSelectedRasterLayer = useLayerSelectionStore(
    (state) => state.setSelectRasterLayer
  );

  // 2) Grab reorderLayers + mapLayers from the map-layers store
  const reorderLayers = useMapLayersStore((state) => state.reorderLayers);
  const mapLayers = useMapLayersStore((state) => state.mapLayers);

  // For map display
  const setDisplayMapRequestedFromChatResponse = useMapDisplayStore(
    (state) => state.setDisplayMapRequestedFromChatResponse
  );
  const setZoomToLayerRequestWithGeometry = useZoomRequestStore(
    (state) => state.setZoomToLayerRequestWithGeometry
  );

  const handleClick = () => {
    // If we’re switching to a different raster, update the selection
    if (analysisLayerName !== selectedRasterLayer.layerName) {
      setSelectedRasterLayer(analysisLayerName);
    }

    // 3) Reorder the layers so `analysisLayerName` is last (on top in your store)
    const layerNames = mapLayers.map((l) => l.name);
    const index = layerNames.indexOf(analysisLayerName);
    if (index !== -1) {
      layerNames.splice(index, 1); // remove it
      layerNames.push(analysisLayerName); // put it at the end
      reorderLayers(layerNames);
    }

    // Trigger your zoom / display map
    setZoomToLayerRequestWithGeometry(analysisLayerName);
    setDisplayMapRequestedFromChatResponse(true);
  };

  return (
    <div className="">
      <button
        className="flex items-center bg-blue-500 border min-h-20 border-stone-300 
                   dark:border-stone-600 bg-opacity-15 text-sm font-medium 
                   px-3 py-2 rounded-md hover:bg-opacity-20"
        onClick={handleClick}
      >
        <IconMap stroke={1.3} size={25} className="mr-3" />
        <span className="flex flex-col">
          <span>{analysisLayerName}</span>
          <span className="text-xs text-muted-foreground self-start">
            Click to open map
          </span>
        </span>
      </button>
    </div>
  );
};

export default DisplayInChatAnalysisMapBtn;
