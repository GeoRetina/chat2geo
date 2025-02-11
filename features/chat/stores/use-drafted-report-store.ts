import { create } from "zustand";

interface ReportState {
  draftedReport: string | null; // Holds the report content, or null if no report is drafted
  reportFileName: string; // Holds the name of the report file
  setReportFileName: (fileName: string) => void; // Function to set the report file name
  setDraftedReport: (report: string) => void; // Function to set a new report
  clearDraftedReport: () => void; // Function to clear the report
  reset: () => void; // Resets all store properties to their initial state
}

const initialState = {
  draftedReport: null,
  reportFileName: "",
};

const useDraftedReportStore = create<ReportState>((set) => ({
  ...initialState,

  setReportFileName: (fileName) => set({ reportFileName: fileName }),

  setDraftedReport: (report) => set({ draftedReport: report }),

  clearDraftedReport: () => set({ draftedReport: null }),

  // Resets the store to the initial defaults
  reset: () => set({ ...initialState }),
}));

export default useDraftedReportStore;
