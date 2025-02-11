import { create } from "zustand";

// Define the page structure for sources
interface Page {
  page: number;
  score: number;
}

// Define the structure of each source
interface Source {
  documentName: string;
  pages: Page[];
}

// Define the store's state and actions
interface ChatSourcesState {
  chatResponseId: string | null; // To track the current source ID
  sources: Source[]; // Array to hold sources grouped by document
  setSources: (id: string, newSources: Source[]) => void; // Set source ID and sources
  clearSources: () => void; // Clear both source ID and sources
  reset: () => void; // Reset to initial defaults
}

const initialState = {
  chatResponseId: null as string | null,
  sources: [] as Source[],
};

// Create the Zustand store
const useChatSourcesStore = create<ChatSourcesState>((set) => ({
  ...initialState,

  setSources: (id, newSources) =>
    set({
      chatResponseId: id,
      sources: newSources,
    }),

  clearSources: () => set({ chatResponseId: null, sources: [] }),

  // Reset the store to initial state
  reset: () => set({ ...initialState }),
}));

export default useChatSourcesStore;
