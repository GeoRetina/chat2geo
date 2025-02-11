import React, { useEffect } from "react";
import useDraftedReportStore from "@/features/chat/stores/use-drafted-report-store";
import { IconClipboardText } from "@tabler/icons-react";

interface DraftedReportBtnProps {
  report: string;
  reportFileName: string;
}
const DraftedReportBtn = ({
  report,
  reportFileName,
}: DraftedReportBtnProps) => {
  const setDraftedReport = useDraftedReportStore(
    (state) => state.setDraftedReport
  );

  const handleClick = () => {
    setDraftedReport(report);
  };

  return (
    <div className="">
      <button
        className="flex items-center bg-green-500 border min-h-20 border-stone-300 dark:border-stone-600 bg-opacity-15 text-sm font-medium px-3 py-2 rounded-md hover:bg-opacity-20"
        onClick={handleClick}
      >
        <IconClipboardText stroke={1.3} size={25} className="mr-3" />{" "}
        <span className="flex flex-col">
          <span>{reportFileName}</span>
          <span className="text-xs text-muted-foreground self-start">
            Click to open report
          </span>
        </span>
      </button>
    </div>
  );
};

export default DraftedReportBtn;
