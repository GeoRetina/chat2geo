"use client";
import React, {
  useRef,
  memo,
  useState,
  useEffect,
  useMemo,
  RefObject,
} from "react";
import { RichTextarea, RichTextareaHandle } from "rich-textarea";
import { createPortal } from "react-dom";
import SlashMenuForMapLayers from "./slash-menu-for-map-layers";
import { useAttachmentStore } from "../../stores/use-attachments-store";
import useROIStore from "@/features/maps/stores/use-roi-store";
import {
  getCommandRendererSlashMenuMapLayersRenderer,
  COMMAND_REG,
} from "@/features/chat/utils/slash-menu-utils";

// Components
import ChatInputDropzone from "./chat-input-dropzone";
import { ChatInputButtons } from "./chat-input-buttons/chat-input-buttons";

// Custom Hooks
import { useTextareaResize } from "@/features/chat/utils/use-Textarea-resize";
import { useSlashCommandMenu } from "@/features/chat/utils/use-slash-command-menu";
import { useDragAndDropFileImport } from "@/features/chat/utils/use-drag-and-drop-file-import";

interface ChatInputBoxProps {
  onSendMessage: () => void;
  inputValue: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isStreaming: boolean;
}

const ChatInputBox = memo<ChatInputBoxProps>(
  ({
    onSendMessage,
    inputValue,
    handleInputChange,
    handleKeyDown,
    isStreaming,
  }) => {
    const textareaRef = useRef<RichTextareaHandle>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Store hooks
    const addAttachment = useAttachmentStore((state) => state.addAttachment);
    const removeAttachment = useAttachmentStore(
      (state) => state.removeAttachment
    );

    const sessionRoiGeometries = useROIStore((state) => state.roiGeometries);

    // ROI geometries state
    const [currentRoiGeometries, setCurrentRoiGeometries] = useState(
      sessionRoiGeometries.length > 0
        ? sessionRoiGeometries.map((roi) => roi.name)
        : [" "]
    );

    // Update ROI geometries state
    useEffect(() => {
      if (sessionRoiGeometries.length > 0) {
        setCurrentRoiGeometries(sessionRoiGeometries.map((roi) => roi.name));
      }
    }, [sessionRoiGeometries]);

    // Custom hooks
    const textareaHeight = useTextareaResize(
      textareaRef as RefObject<RichTextareaHandle>,
      inputValue
    );

    const {
      menuPos,
      setMenuPos,
      selectedIndex,
      setSelectedIndex,
      menuHeight,
      filteredCommands,
      completeCommand,
      handleKeyDown: handleSlashMenuKeyDown,
    } = useSlashCommandMenu({
      inputValue,
      currentRoiGeometries,
      textareaRef: textareaRef as RefObject<RichTextareaHandle>,
    });

    const { getRootProps, getInputProps, isDragActive, open } =
      useDragAndDropFileImport(addAttachment);

    // Command renderer memo
    const commandRendererSlashMenuMapLayersRenderer = useMemo(
      () =>
        getCommandRendererSlashMenuMapLayersRenderer(
          currentRoiGeometries.length > 0 ? currentRoiGeometries : [" "]
        ),
      [currentRoiGeometries]
    );

    // Submit handler
    const handleSubmit = async () => {
      if (isSubmitting || isStreaming || !inputValue.trim()) return;
      try {
        setIsSubmitting(true);
        await onSendMessage();
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div
        className="flex flex-col gap-4 bg-gray-100 [box-shadow:0_-20px_20px_rgba(240,250,250,0.6),0_6px_10px_rgba(0,0,0,0.2)] dark:bg-accent dark:[box-shadow:0_-20px_20px_rgba(31,31,33,0.9),0_6px_10px_rgba(0,0,0,0.2)] h-full rounded-3xl items-center z-[1000] border border-stone-300 dark:border-stone-600"
        style={{
          minHeight: "160px",
        }}
      >
        <div
          {...getRootProps()}
          className="relative w-[400px] md:w-[500px] lg:w-[600px] xl:w-[700px] max-w-[700px] h-full min-h-[160px]"
        >
          <input {...getInputProps()} />
          <RichTextarea
            ref={textareaRef}
            placeholder="Type a message..."
            value={inputValue}
            onChange={handleInputChange}
            autoHeight={true}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) =>
              handleSlashMenuKeyDown(e, handleKeyDown)
            }
            onSelectionChange={(r: any) => {
              if (
                r.focused &&
                COMMAND_REG.test(inputValue.slice(0, r.selectionStart))
              ) {
                setMenuPos({
                  top: r.top,
                  left: r.left,
                  caret: r.selectionStart,
                });
                setSelectedIndex(0);
              } else {
                setMenuPos(null);
                setSelectedIndex(0);
              }
            }}
            className="py-4 px-4 h-full w-[400px] md:w-[500px] lg:w-[600px] xl:w-[700px] max-w-[700px] pb-16 z-[1000] bg-transparent overflow-hidden focus:outline-none focus:border-[#44403C] resize-none"
            style={{
              caretColor: "hsl(var(--foreground))",
            }}
          >
            {currentRoiGeometries[0]?.trim() &&
              commandRendererSlashMenuMapLayersRenderer}
          </RichTextarea>

          <ChatInputDropzone isDragActive={isDragActive} />
          <ChatInputButtons
            isStreaming={isStreaming}
            handleSubmit={handleSubmit}
            inputValue={inputValue}
            openFileDialog={open}
          />
        </div>

        {menuPos &&
          currentRoiGeometries[0]?.trim() &&
          createPortal(
            <SlashMenuForMapLayers
              commands={filteredCommands}
              index={selectedIndex}
              top={menuPos.top}
              left={menuPos.left}
              complete={completeCommand}
              menuHeight={menuHeight}
            />,
            document.body
          )}
      </div>
    );
  }
);

ChatInputBox.displayName = "ChatInputBox";

export default ChatInputBox;
