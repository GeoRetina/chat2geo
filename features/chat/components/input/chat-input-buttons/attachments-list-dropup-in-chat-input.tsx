import React from "react";
import { IconTrash } from "@tabler/icons-react";
import { useAttachmentStore } from "@/features/chat/stores/use-attachments-store";

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const AttachmentsListDropUpInChatInput: React.FC = () => {
  const { attachments, removeAttachment } = useAttachmentStore();

  if (attachments.length === 0) return null;

  return (
    <div className="relative mb-2 bg-white rounded-xl p-2 min-w-[80px] border border-stone-300">
      {/* Header */}
      <div className="font-medium text-sm bg-gray-100 rounded-t-lg p-2 text-gray-700">
        Attached Files ({attachments.length})
      </div>

      {/* Attachments List */}
      <ul className="divide-y divide-gray-200">
        {attachments.map((file) => (
          <li
            key={file.id}
            className="flex items-start justify-between px-2 py-2 gap-2"
          >
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold text-gray-700">
                {file.name}
              </div>
              <div className="text-xs text-gray-500">
                {formatFileSize(file.size)}
              </div>
            </div>

            {/* Remove Button */}
            <button
              onClick={() => removeAttachment(file.id)}
              className="p-1 "
              aria-label="Remove attachment"
            >
              <IconTrash
                size={18}
                className=" hover:text-red-600 hover:scale-110"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AttachmentsListDropUpInChatInput;
