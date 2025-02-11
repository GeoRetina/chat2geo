import React, { useState, useEffect } from "react";
import { IconServer, IconX } from "@tabler/icons-react";
import AttachmentsListDropUpInChatInput from "@/features/chat/components/input/chat-input-buttons/attachments-list-dropup-in-chat-input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useAttachmentStore } from "@/features/chat/stores/use-attachments-store";
import useROIStore from "@/features/maps/stores/use-roi-store";
import { Separator } from "@/components/ui/separator";
import { removeExtension } from "@/utils/general/general-utils";

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
}

const CurrentSessionAssetsDropup = () => {
  const [isDropupOpen, setIsDropupOpen] = useState(false);
  const attachments = useAttachmentStore((state) => state.attachments);
  const roiGeometries = useROIStore((state) => state.roiGeometries);
  const [numberOfSessionAssets, setNumberOfSessionAssets] = useState(0);
  const [uniqueROIs, setUniqueROIs] = useState<ROIGeometry[]>([]);
  const [filteredAttachments, setFilteredAttachments] = useState<Attachment[]>(
    []
  );

  // Handle duplicate detection and update counts
  useEffect(() => {
    // Get set of ROI names
    const roiNames = new Set(roiGeometries.map((roi) => roi.name));

    // Filter out attachments that have matching ROI names
    const nonROIAttachments = attachments.filter(
      (att) => !roiNames.has(removeExtension(att.name))
    );

    setFilteredAttachments(nonROIAttachments);

    // Process ROIs - mark those with matching attachment names as imported
    const processedROIs = roiGeometries.map((roi) => {
      const matchingAttachment = attachments.find(
        (att) => removeExtension(att.name) === roi.name
      );
      if (matchingAttachment) {
        return { ...roi, source: "attached" as const };
      }
      return roi;
    });

    setUniqueROIs(processedROIs);

    // Total count is unique ROIs plus non-ROI attachments
    const totalAssets = processedROIs.length + nonROIAttachments.length;
    setNumberOfSessionAssets(totalAssets);

    // Close dropup if no assets
    if (totalAssets === 0) {
      setIsDropupOpen(false);
    }
  }, [attachments, roiGeometries]);

  // Close dropup when pressing Escape
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (isDropupOpen && event.key === "Escape") {
        setIsDropupOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [isDropupOpen]);

  const handleToggleDropup = () => {
    if (numberOfSessionAssets > 0) {
      setIsDropupOpen((prev) => !prev);
    }
  };

  const handleCloseDropup = () => setIsDropupOpen(false);

  const ROILayersList = () => {
    if (uniqueROIs.length === 0) return null;

    return (
      <div className="mt-4 bg-accent/40 p-3 rounded-xl">
        <h3 className="text-sm font-bold mb-2 text-primary/80">ROI Layers</h3>
        <div className="space-y-2 w-fit">
          {uniqueROIs.map((roi: ROIGeometry) => (
            <div
              key={roi.id}
              className="flex items-center justify-between p-2  rounded-md shadow-sm"
            >
              <div className="flex items-center space-x-5">
                <span className="text-sm text-primary font-medium">
                  {roi.name}
                </span>
                <span className="text-xs text-primary/90 px-2 py-1 bg-accent/30 border border-stone-300 dark: dark:border-stone-600 rounded">
                  {roi.source}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`absolute ml-2 left-20 bottom-5 z-[1000] ${
                attachments.length === 0 && roiGeometries.length === 0
                  ? "text-muted-foreground"
                  : "text-primary hover:text-accent"
              }`}
              onClick={handleToggleDropup}
              disabled={attachments.length === 0 && roiGeometries.length === 0}
            >
              <div>
                <IconServer
                  stroke={2}
                  className={`h-6 w-6 ${
                    numberOfSessionAssets === 0
                      ? "text-muted-foreground"
                      : isDropupOpen
                      ? "text-blue-600"
                      : "text-primary"
                  }`}
                />
                {numberOfSessionAssets > 0 && (
                  <span className="absolute -top-[6px] -right-[5px] h-4 min-w-4 flex items-center justify-center leading-none text-xs font-semibold text-white bg-blue-500 rounded-full">
                    {numberOfSessionAssets}
                  </span>
                )}
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {attachments.length === 0 && roiGeometries.length === 0
              ? "No assets added"
              : "View your session assets"}
          </TooltipContent>
        </Tooltip>
        {isDropupOpen && (
          <>
            <div
              className="fixed inset-0 z-[1999]"
              onClick={handleCloseDropup}
            />
            <div
              className="absolute w-full bottom-full left-0 mb-2 bg-secondary rounded-3xl border border-stone-300 dark:border-stone-600 shadow-lg p-6 z-[2000]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-md font-bold text-primary/80">
                  Session Assets
                </h2>
                <button
                  onClick={handleCloseDropup}
                  className="text-primary hover:text-primary/90"
                >
                  <IconX size={17} />
                </button>
              </div>
              <Separator />
              {filteredAttachments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Attachments</h3>
                  <div className="space-y-2">
                    {filteredAttachments.map((attachment: Attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-2 bg-primary rounded-md shadow-sm"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-primary/90">
                            {attachment.name}
                          </span>
                          <span className="text-xs text-primary/70 px-2 py-1 bg-primary/90 rounded">
                            {attachment.type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <ROILayersList />
            </div>
          </>
        )}
      </>
    </TooltipProvider>
  );
};

export default CurrentSessionAssetsDropup;
