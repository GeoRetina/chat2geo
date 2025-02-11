"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  ReactNode,
  CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  GripVertical,
  ZoomIn,
  Settings,
  Eye,
  EyeOff,
  Trash2,
  Palette,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button, buttonVariants } from "@/components/ui/button";
import { HexColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";

// ---- stores ----
import useMapDisplayStore from "@/features/maps/stores/use-map-display-store";
import useMapLayersStore from "@/features/maps/stores/use-map-layer-store";
import useZoomRequestStore from "@/features/maps/stores/use-map-zoom-request-store";
import useColorPickerStore from "@/features/maps/stores/use-color-picker-store";
import useROIStore from "@/features/maps/stores/use-roi-store";
import useLayerSelectionStore from "@/features/maps/stores/use-layer-selection-store";
import { useAttachmentStore } from "@/features/chat/stores/use-attachments-store";

// ---- components ----
import Legend from "./map-legend";

/** 1) A small helper that conditionally portals the Draggable item. */
function DraggablePortal({
  provided,
  snapshot,
  children,
}: {
  provided: any;
  snapshot: any;
  children: ReactNode;
}) {
  // If not dragging, just render in place:
  if (!snapshot.isDragging) {
    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        style={provided.draggableProps.style as CSSProperties}
      >
        {children}
      </div>
    );
  }

  // If dragging, portal to document.body
  return createPortal(
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      style={provided.draggableProps.style as CSSProperties}
    >
      {children}
    </div>,
    document.body
  );
}

export default function MapLayersPanel() {
  const isMapLayersPanelOpen = useMapDisplayStore(
    (state) => state.isMapLayersPanelOpen
  );
  const toggleMapLayersPanel = useMapDisplayStore(
    (state) => state.toggleMapLayersPanel
  );

  const mapLayers = useMapLayersStore((state) => state.mapLayers);
  const toggleMapLayerVisibility = useMapLayersStore(
    (state) => state.toggleMapLayerVisibility
  );
  const reorderLayers = useMapLayersStore((state) => state.reorderLayers);
  const removeMapLayer = useMapLayersStore((state) => state.removeMapLayer);
  const setZoomToLayerRequestWithGeometry = useZoomRequestStore(
    (state) => state.setZoomToLayerRequestWithGeometry
  );
  const setSelectRasterLayer = useLayerSelectionStore(
    (state) => state.setSelectRasterLayer
  );
  const isROIDrawingActive = useROIStore((state) => state.isROIDrawingActive);

  const removeAttachedLayer = useAttachmentStore(
    (state) => state.removeAttachment
  );

  // Color picker store
  const { pickedColor, setPickedColor } = useColorPickerStore();

  const [selectedLayer, setSelectedLayer] = useState("");

  // Track which legends are expanded
  const [legendOpen, setLegendOpen] = useState<{
    [layerName: string]: boolean;
  }>({});

  const toggleLegend = (layerName: string) => {
    setLegendOpen((prev) => ({
      ...prev,
      [layerName]: !prev[layerName],
    }));
  };

  // Toggle layer visibility
  const handleToggleLayer = (layerName: string) => {
    toggleMapLayerVisibility(layerName);
  };

  // DnD reorder
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    // This logic already accounts for the reversed UI display:
    const sourceIndex = mapLayers.length - 1 - result.source.index;
    const destinationIndex = mapLayers.length - 1 - result.destination.index;

    const reordered = mapLayers.map((l) => l.name);
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(destinationIndex, 0, removed);
    reorderLayers(reordered);

    const updatedMapLayers = useMapLayersStore.getState().mapLayers;
    // Find the first (top-most) raster layer
    const topRasterLayer = [...updatedMapLayers]
      .reverse()
      .find((layer) => layer.type === "raster");
    // If we found a top raster layer, select it in the layer selection store
    if (topRasterLayer) {
      setSelectRasterLayer(topRasterLayer.name);
    } else {
      // optional: if you want to clear the selection if no raster layers remain
      setSelectRasterLayer("");
    }
  };

  // Track selected row
  const handleSelectLayer = useCallback((layerName: string) => {
    setSelectedLayer(layerName);
  }, []);

  // Zoom
  const handleZoomToLayer = (layerName: string) => {
    setZoomToLayerRequestWithGeometry(layerName);
  };

  // Delete
  const handleDeleteLayer = (layerName: string) => {
    removeMapLayer(layerName);
    const mapLayer = mapLayers.find((layer) => layer.name === layerName);
    if (mapLayer?.type === "roi") {
      removeAttachedLayer(layerName);
    }
  };

  // Close the panel if the ROI drawing
  useEffect(() => {
    if (isROIDrawingActive && isMapLayersPanelOpen) {
      toggleMapLayersPanel();
    }
  }, [isROIDrawingActive, isMapLayersPanelOpen]);

  // Always select the top-most raster layer if it exists:
  useEffect(() => {
    const topRasterLayer = [...mapLayers]
      .reverse()
      .find((layer) => layer.type === "raster");

    setSelectRasterLayer(topRasterLayer ? topRasterLayer.name : "");
  }, [mapLayers, setSelectRasterLayer]);

  return (
    <div
      className={cn(
        "absolute top-20 bottom-20 left-0 w-72 rounded-r-xl shadow-lg bg-secondary z-50 transition-transform duration-300",
        isMapLayersPanelOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex flex-col w-full h-full">
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-foreground">Map Layers</h2>
          <Button variant="ghost" size="icon" onClick={toggleMapLayersPanel}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Scrollable panel body */}
        <div className="flex-1">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="layers" direction="vertical">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="h-full"
                >
                  {[...mapLayers].reverse().map((layer, index) => (
                    <Draggable
                      key={layer.id}
                      draggableId={layer.name}
                      index={index}
                    >
                      {(provided, snapshot) => {
                        // The actual content you want to display:
                        const content = (
                          <div
                            className={cn(
                              "relative group shadow-lg select-none transition-colors bg-secondary hover-bg-secondary/50",
                              snapshot.isDragging
                                ? "border-2 border-blue-500 shadow-lg" // while dragging
                                : "border-b border-stone-300 dark:border-stone-600"
                            )}
                          >
                            <div className="px-3 py-3 flex flex-col gap-1">
                              {/* Row 1: Drag handle + Eye toggle + Name */}
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  {...provided.dragHandleProps}
                                  className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground/80"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>

                                <Button
                                  onClick={() => handleToggleLayer(layer.name)}
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0"
                                >
                                  {layer.visible ? (
                                    <Eye className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </Button>

                                <div
                                  className="flex-1 cursor-pointer overflow-hidden break-words custom-scrollbar"
                                  onClick={() => handleSelectLayer(layer.name)}
                                >
                                  <span className="text-sm font-medium text-foreground">
                                    {layer.name}
                                  </span>
                                </div>
                              </div>

                              {/* Row 2: Zoom, Settings, Legend Toggle */}
                              <div className="flex items-center gap-2 ml-11 transition-opacity relative">
                                {/* Zoom button */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleZoomToLayer(layer.name)}
                                >
                                  <ZoomIn className="w-4 h-4 text-muted-foreground" />
                                </Button>

                                {/* Settings Menu */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <span
                                      className={cn(
                                        buttonVariants({
                                          variant: "ghost",
                                          size: "icon",
                                        }),
                                        "cursor-pointer"
                                      )}
                                    >
                                      <Settings className="w-4 h-4 text-muted-foreground" />
                                    </span>
                                  </DropdownMenuTrigger>

                                  <DropdownMenuContent
                                    align="end"
                                    side="bottom"
                                    sideOffset={8}
                                    className="z-[9999] w-36"
                                  >
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleDeleteLayer(layer.name)
                                      }
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />

                                    {layer.type !== "raster" && (
                                      <DropdownMenuItem asChild>
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <div
                                              className={cn(
                                                "relative flex h-8 w-full select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                                                "hover:bg-accent/70 focus:bg-accent/70",
                                                "focus:text-accent-foreground cursor-default"
                                              )}
                                              onClick={() => {
                                                const newColor =
                                                  pickedColor.color ||
                                                  "#ffffff";
                                                setPickedColor(
                                                  newColor,
                                                  layer.name
                                                );
                                              }}
                                            >
                                              <Palette className="h-4 w-4 mr-2" />
                                              Pick Color
                                            </div>
                                          </PopoverTrigger>

                                          <PopoverContent
                                            side="right"
                                            align="start"
                                            sideOffset={8}
                                            className="z-[9999] p-2 w-auto"
                                          >
                                            <HexColorPicker
                                              color={pickedColor.color}
                                              onChange={(newColor) => {
                                                if (pickedColor.layerName) {
                                                  setPickedColor(
                                                    newColor,
                                                    pickedColor.layerName
                                                  );
                                                }
                                              }}
                                              className="min-w-[180px] max-w-[200px]"
                                            />
                                          </PopoverContent>
                                        </Popover>
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Legend Toggle (Only for raster layers) */}
                                {layer.type === "raster" && (
                                  <button
                                    onClick={() => toggleLegend(layer.name)}
                                    className={cn(
                                      buttonVariants({
                                        variant: "ghost",
                                        size: "icon",
                                      }),
                                      "cursor-pointer flex items-center gap-1"
                                    )}
                                  >
                                    {legendOpen[layer.name] ? (
                                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* Row 3: Legend if open (raster only) */}
                              {layer.type === "raster" &&
                                legendOpen[layer.name] && (
                                  <div className="ml-11">
                                    <Legend
                                      layerFunctionType={
                                        layer.layerFunctionType || ""
                                      }
                                      layerName={layer.name}
                                    />
                                  </div>
                                )}
                            </div>
                          </div>
                        );

                        // 2) Use DraggablePortal for your item
                        return (
                          <DraggablePortal
                            provided={provided}
                            snapshot={snapshot}
                          >
                            {content}
                          </DraggablePortal>
                        );
                      }}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>
    </div>
  );
}
