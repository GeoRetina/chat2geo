import React, { useState } from "react";
import { useButtonsStore } from "@/stores/use-buttons-store";
import useROIStore from "@/features/maps/stores/use-roi-store";
import AddressSearch from "../address-search";
import { Button } from "@/components/ui/button";
import InputTextConfirm from "@/components/ui/input-text-confirm";
import { Layers, SquareMousePointer } from "lucide-react";

// 1) Import Shadcn tooltip components
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const MapRoiControls = () => {
  const activeDrawingMode = useButtonsStore((state) => state.activeDrawingMode);
  const setDrawingMode = useButtonsStore((state) => state.setDrawingMode);
  const toggleBasemap = useButtonsStore((state) => state.toggleBasemap);

  const isRoiCreated = useROIStore((state) => state.isRoiCreated);
  const setIsRoiCreated = useROIStore((state) => state.setIsRoiCreated);
  const setIsRoiFinalized = useROIStore((state) => state.setIsRoiFinalized);

  const [isSelectRoiNameOpen, setIsSelectRoiNameOpen] = useState(false);

  function handleRoiConfirm() {
    setIsSelectRoiNameOpen(true);
  }

  function handleRoiFinalize(name: string) {
    setIsRoiFinalized(true, name);
    setIsRoiCreated(false);
  }

  // 2) Decide on tooltip text for the “polygon” button
  const polygonButtonTooltip =
    activeDrawingMode === "draw_polygon"
      ? "Click to cancel"
      : "Select a location on the map";

  return (
    <div className="flex justify-center items-center gap-4 bg-foreground/30 bg-opacity-60 w-fit p-2 h-fit rounded-2xl">
      {isSelectRoiNameOpen && (
        <InputTextConfirm
          isOpen={isSelectRoiNameOpen}
          onClose={() => setIsSelectRoiNameOpen(false)}
          onSubmit={handleRoiFinalize}
          title="Enter ROI Name"
        />
      )}

      {isRoiCreated && (
        <Button
          size="sm"
          variant="warning"
          className="font-semibold text-gray-800"
          onClick={handleRoiConfirm}
        >
          Finalize ROI
        </Button>
      )}

      {/* 4) “Draw Polygon” Button + Tooltip */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="bg-background [&_svg]:size-5"
            onClick={() => setDrawingMode("draw_polygon")}
            disabled={activeDrawingMode === "draw_polygon"}
          >
            <SquareMousePointer className="text-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{polygonButtonTooltip}</TooltipContent>
      </Tooltip>

      <AddressSearch />

      {/* 5) “Toggle Basemap” Button + Tooltip */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="bg-background [&_svg]:size-5"
            variant="ghost"
            size="icon"
            onClick={toggleBasemap}
          >
            <Layers className="text-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Toggle basemap</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default MapRoiControls;
