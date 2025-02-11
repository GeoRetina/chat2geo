import { create } from "zustand";
import { checkLayerName } from "@/features/maps/utils/general-checks";

// Define the type for an attachment
export interface AttachmentFile {
  id: string; // Unique identifier for the attachment
  name: string; // File name
  size: number; // File size in bytes
  type: string; // MIME type (e.g., "application/pdf")
  uploadedAt: Date; // Timestamp for when the attachment was added
}

// Define the store's state and actions
interface AttachmentStore {
  attachments: AttachmentFile[];
  addAttachment: (file: File) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  reset: () => void;
}

const initialState = {
  attachments: [] as AttachmentFile[],
};

export const useAttachmentStore = create<AttachmentStore>((set) => ({
  ...initialState,

  addAttachment: (file: File) =>
    set((state) => {
      // Step 1: Gather all existing attachment names for files of the same type
      const existingNamesForThisType = state.attachments
        .filter((att) => att.type === file.type)
        .map((att) => att.name);

      // Step 2: Generate a unique name based on the incoming file's name
      const uniqueName = checkLayerName(file.name, existingNamesForThisType);

      // Step 3: Create the new attachment object
      const newAttachment: AttachmentFile = {
        // Use the unique name as part of your ID, or just keep using file.name—your choice
        id: `${uniqueName}-${Date.now()}`,
        name: uniqueName,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
      };

      // Step 4: Return the updated attachments array
      return { attachments: [...state.attachments, newAttachment] };
    }),

  removeAttachment: (id: string) =>
    set((state) => ({
      attachments: state.attachments.filter(
        (attachment) => attachment.id !== id
      ),
    })),

  clearAttachments: () => set({ attachments: [] }),

  reset: () => set({ ...initialState }),
}));
