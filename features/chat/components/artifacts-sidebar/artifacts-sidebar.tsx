"use client";
import React, { use, useEffect } from "react";
import { useButtonsStore } from "@/stores/use-buttons-store";
import MapContainer from "@/features/maps/components/map-container";
import useMapDisplayStore from "@/features/maps/stores/use-map-display-store";
import GenerateReport from "../chat-response-box/in-response-tool-calling-results/draft-report/draft-report";
import useDraftedReportStore from "@/features/chat/stores/use-drafted-report-store";
import useROIStore from "@/features/maps/stores/use-roi-store";
import { Button } from "@/components/ui/button";
import { MoveRight } from "lucide-react";
import useMapLayersStore from "@/features/maps/stores/use-map-layer-store";

const ArtifactsSidebar = () => {
  const isArtifactsSidebarOpen = useButtonsStore(
    (state) => state.isArtifactsSidebarOpen
  );
  const toggleArtifactsSidebar = useButtonsStore(
    (state) => state.toggleArtifactsSidebar
  );

  const draftedReport = useDraftedReportStore((state) => state.draftedReport);

  const setDraftedReport = useDraftedReportStore(
    (state) => state.setDraftedReport
  );
  const displayMapRequestedFromChatResponse = useMapDisplayStore(
    (state) => state.displayMapRequestedFromChatResponse
  );

  const setMapLoaded = useMapLayersStore((state) => state.setMapLoaded);

  const displayRawMapRequestedFromInsightsViewerIcon = useMapDisplayStore(
    (state) => state.displayRawMapRequestedFromInsightsViewerIcon
  );
  const setDisplayMapRequestedFromChatResponse = useMapDisplayStore(
    (state) => state.setDisplayMapRequestedFromChatResponse
  );

  const mapMaximizeRequested = useMapDisplayStore(
    (state) => state.mapMaximizeRequested
  );
  const isSidebarCollapsed = useButtonsStore(
    (state) => state.isSidebarCollapsed
  );
  const isROIDrawingActive = useROIStore((state) => state.isROIDrawingActive);
  const setIsROIDrawingActive = useROIStore(
    (state) => state.setIsROIDrawingActive
  );

  const handleToggleArtifactsSidebar = () => {
    toggleArtifactsSidebar();
    setDraftedReport("");
    setDisplayMapRequestedFromChatResponse(false);
    setIsROIDrawingActive(false);
  };

  useEffect(() => {
    if (
      !isArtifactsSidebarOpen &&
      (displayMapRequestedFromChatResponse || draftedReport)
    ) {
      toggleArtifactsSidebar();
    }
  }, [displayMapRequestedFromChatResponse, draftedReport]);

  useEffect(() => {
    if (isROIDrawingActive) {
      setDraftedReport("");
      setDisplayMapRequestedFromChatResponse(true);
    } else {
      setDisplayMapRequestedFromChatResponse(false);
      if (isArtifactsSidebarOpen) {
        toggleArtifactsSidebar();
      }
    }
  }, [isROIDrawingActive]);

  useEffect(() => {
    if (draftedReport) {
      setMapLoaded(false);
    }
  }, [draftedReport]);

  return (
    <div
      className={`${!isArtifactsSidebarOpen ? "hidden" : ""}
      fixed right-0 top-0 h-full ${
        mapMaximizeRequested
          ? isSidebarCollapsed
            ? "w-[calc(100vw-5rem)]"
            : "w-[calc(100vw-16rem)]"
          : "w-[45vw]"
      } bg-background dark:bg-accent shadow-xl flex flex-col
      border-l border-stone-300 dark:border-stone-600 transform transition-transform duration-300 
      ease-in-out z-[2000]
    `}
    >
      <div className="flex items-center justify-between bg-secondary px-4 py-3 bg-opacity-10 border-b border-stone-300 dark:border-stone-600">
        <h2 className="text-md font-semibold text-foreground">
          Insights Viewer
        </h2>
        <Button
          onClick={handleToggleArtifactsSidebar}
          className="p-1"
          aria-label="Close sidebar"
          variant="ghost"
          size={"icon"}
        >
          <MoveRight />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 bg-stone-400 bg-opacity-5">
        <div className="flex flex-col items-center justify-center h-full">
          {draftedReport ? (
            <GenerateReport report={draftedReport} />
          ) : (
            <>
              <div
                className={`w-full h-full ${
                  displayMapRequestedFromChatResponse ||
                  displayRawMapRequestedFromInsightsViewerIcon
                    ? "block"
                    : "hidden"
                }`}
              >
                <MapContainer />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ArtifactsSidebar);
