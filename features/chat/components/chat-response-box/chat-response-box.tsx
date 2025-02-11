"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  startTransition,
} from "react";

import { ToolInvocation } from "ai";
import { useChat } from "ai/react";
import ChatInputBox from "../input/chat-input-box";
import { IconDeviceAnalytics } from "@tabler/icons-react";
import { useGeeOutputStore } from "@/features/maps/stores/use-gee-ouput-store";
import useChatResponseSourcesStore from "@/features/chat/stores/use-chat-response-sources-store";
import { useButtonsStore } from "@/stores/use-buttons-store";
import ChatMessage from "./chat-message/chat-message";
import useFunctionStore from "@/features/maps/stores/use-function-store";
import useMapLayersStore from "@/features/maps/stores/use-map-layer-store";
import ArtifactsSidebar from "../artifacts-sidebar/artifacts-sidebar";
import { useSWRConfig } from "swr";
import { transformMetadataToCitations } from "@/features/knowledge-base/utils/transform-metadata-to-citation";
import useROIStore from "@/features/maps/stores/use-roi-store";
import useMapDisplayStore from "@/features/maps/stores/use-map-display-store";
import useMapLegendStore from "@/features/maps/stores/use-map-legend-store";
import { checkUserUsageInChat, generateUUID } from "../../utils/general-utils";
import { useUserStore } from "@/stores/use-user-profile-store";
import useToastMessageStore from "@/stores/use-toast-message-store";
import { CapabilitiesBanner } from "./capabilities-banner";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface MessageCompletionState {
  isComplete: boolean;
  hasAnalysis: boolean;
}

interface ChatResponseBoxProps {
  chatId: string;
  initialMessages: any;
}
const ChatResponseBox = ({ chatId, initialMessages }: ChatResponseBoxProps) => {
  const { mutate } = useSWRConfig();
  const selectedRoiGeometryInChat = useROIStore(
    (state) => state.selectedGeometryInChat
  );

  const addRoiGeometry = useROIStore((state) => state.addRoiGeometry);
  const setRoiGeometryFromSessionHistory = useROIStore(
    (state) => state.setRoiGeometryFromSessionHistory
  );

  const [isChatStarted, setIsChatStarted] = useState(false);
  const usageRequests = useUserStore((state) => state.usageRequests);
  const maxRequests = useUserStore((state) => state.maxRequests);
  const maxArea = useUserStore((state) => state.maxArea);
  const addMapLayer = useMapLayersStore((state) => state.addMapLayer);
  const getMapLayersNames = useMapLayersStore(
    (state) => state.getMapLayerNames
  );
  const addLegend = useMapLegendStore((state) => state.addLegend);
  const setDisplayRawMapRequestedFromInsightsViewerIcon = useMapDisplayStore(
    (state) => state.setDisplayRawMapRequestedFromInsightsViewerIcon
  );

  const [messageResults, setMessageResults] = useState<{
    [messageId: string]: ToolCallingMessageResults;
  }>({});
  const [messageCompletionStates, setMessageCompletionStates] = useState<{
    [key: string]: MessageCompletionState;
  }>({});

  const [pendingToolCallIds, setPendingToolCallIds] = useState<Set<string>>(
    new Set()
  );
  const [toolResults, setToolResults] = useState<Set<string>>(new Set());
  const [pendingResults, setPendingResults] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addNewGeeOutput = useGeeOutputStore((state) => state.addNewGeeOutput);
  const addGeeTempMapInAssetsPath = useGeeOutputStore(
    (state) => state.addTempCreatedMapInAssetsPath
  );
  const addFunctionConfig = useFunctionStore(
    (state) => state.addFunctionConfig
  );

  const isArtifactsSidebarOpen = useButtonsStore(
    (state) => state.isArtifactsSidebarOpen
  );
  const isSidebarCollapsed = useButtonsStore(
    (state) => state.isSidebarCollapsed
  );

  const toggleArtifactsSidebar = useButtonsStore(
    (state) => state.toggleArtifactsSidebar
  );
  const setChatResponseSources = useChatResponseSourcesStore(
    (state) => state.setSources
  );

  const [toolCallTitle, setToolCallTitle] = useState<string>("");

  const [toolCallIdToMessageIdsMap, setToolCallIdToMessageIdsMap] = useState<{
    [key: string]: Set<string>;
  }>({});
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      experimental_throttle: 100,
      onToolCall: (message) => {
        setToolCallTitle((message.toolCall.args as any).title);
      },
      initialMessages: initialMessages,

      body: {
        id: chatId,
        selectedRoiGeometryInChat: selectedRoiGeometryInChat,
        mapLayersNames: getMapLayersNames(),
      },

      onFinish: (message) => {
        mutate("/api/chat-history");
        useUserStore.getState().fetchAndSetUsage();
        // When a message finishes, track its tool call IDs
        const toolCallIds =
          message.toolInvocations?.map(
            (toolInvocation: ToolInvocation) => toolInvocation.toolCallId
          ) || [];

        setPendingToolCallIds((prev) => {
          const newSet = new Set(prev);
          toolCallIds.forEach((id) => newSet.add(id));
          return newSet;
        });

        // Check completion state after tool results are processed
        checkMessageCompletionState(message);
      },
    });

  const handleSendMessage = useCallback(() => {
    if (!isChatStarted) {
      setIsChatStarted(true);
    }
    const userLimitReached = checkUserUsageInChat(
      maxRequests,
      maxArea,
      selectedRoiGeometryInChat?.geometry,
      usageRequests
    );

    if (userLimitReached?.reason) {
      useToastMessageStore
        .getState()
        .setToastMessage(userLimitReached.reason, "error");
      return;
    }
    if (input.trim()) {
      const syntheticEvent = {
        preventDefault: () => {},
      } as React.FormEvent<HTMLFormElement>;

      startTransition(() => {
        setIsAutoScrollEnabled(true);
      });

      handleSubmit(syntheticEvent);
    }
  }, [input, handleSubmit]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const handleOpenArtifactsSidebarWithRawMap = () => {
    toggleArtifactsSidebar();
    setDisplayRawMapRequestedFromInsightsViewerIcon(true);
  };

  const checkMessageCompletionState = useCallback(
    (message: any) => {
      const isToolInvocationComplete = !message.toolInvocations?.some(
        (toolInvocation: ToolInvocation) =>
          toolInvocation.toolName && !(toolInvocation as any).result
      );

      if (isToolInvocationComplete) {
        // Get all tool call IDs for this message
        const messageToolCallIds = new Set(
          message.toolInvocations?.map(
            (toolInvocation: ToolInvocation) => toolInvocation.toolCallId
          ) || []
        );

        // Check if all tool results have been processed
        const allToolResultsProcessed = Array.from(messageToolCallIds).every(
          (toolCallId) => !pendingToolCallIds.has(toolCallId as string)
        );

        if (allToolResultsProcessed) {
          setMessageCompletionStates((prev) => ({
            ...prev,
            [message.id]: {
              isComplete: true,
              hasAnalysis: true, // TODO: Update this because it may not be reliable for all cases.
            },
          }));
        }
      }
    },
    [toolCallIdToMessageIdsMap, pendingToolCallIds]
  );

  // Auto-scroll to the bottom of the chat box when new messages are added
  useEffect(() => {
    if (isAutoScrollEnabled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAutoScrollEnabled]);

  // Collect the results of the tool calls
  useEffect(() => {
    messages.forEach((m) => {
      m.toolInvocations?.forEach((toolInvocation: ToolInvocation) => {
        const extractedToolCallId = toolInvocation.toolCallId;

        if (
          toolInvocation.toolName &&
          (toolInvocation as any).result &&
          !toolResults.has(extractedToolCallId)
        ) {
          setToolResults((prev) => new Set(prev).add(extractedToolCallId));
          const result = (toolInvocation as any).result;
          setPendingResults((prev) => [
            ...prev,
            {
              ...result,
              toolCallId: extractedToolCallId,
              toolName: toolInvocation.toolName,
            },
          ]);
        }
      });
    });
  }, [messages]);

  //Process the results of the tool calls
  // This optmized effect was given by Claude. Should be tested further
  useEffect(() => {
    if (pendingResults.length === 0 || isLoading) return;

    const processResults = async () => {
      for (const result of pendingResults) {
        if (result.error) {
          continue;
        }

        const { toolCallId, toolName } = result;

        // Find the last assistant message that came after this tool call
        const messageSequence = Array.from(
          toolCallIdToMessageIdsMap[toolCallId] || []
        );

        const lastAssistantMessage = messages
          .filter(
            (m) => messageSequence.includes(m.id) && m.role === "assistant"
          )
          .pop();

        if (!lastAssistantMessage) continue;

        const lastMessageId = lastAssistantMessage.id;

        switch (toolName) {
          /////////////////////////////////////////////////////////////////////////
          // Handle Geospatial ANALYSIS
          /////////////////////////////////////////////////////////////////////////
          case "requestGeospatialAnalysis": {
            const {
              urlFormat,
              legendConfig,
              mapStats,
              layerName,
              uhiMetrics,
              functionType,
              startDate1,
              endDate1,
              startDate2,
              endDate2,
              aggregationMethod,
              selectedRoiGeometry,
              tempCreatedMapInAssetsPath,
            } = result;

            startTransition(() => {
              // Add the result to the message state
              setMessageResults((prev) => ({
                ...prev,
                [lastMessageId]: {
                  ...prev[lastMessageId],
                  geospatialAnalysis: {
                    urlFormat,
                    legendConfig,
                    mapStats,
                    layerName,
                    uhiMetrics,
                    functionType,
                  },
                },
              }));

              addNewGeeOutput({
                urlFormat,
                mapStats,
                legendConfig,
                layerName,
                uhiMetrics,
              });

              if (tempCreatedMapInAssetsPath) {
                addGeeTempMapInAssetsPath(
                  layerName,
                  tempCreatedMapInAssetsPath
                );
              }

              // Save analysis config
              addFunctionConfig({
                functionType,
                layerName,
                selectedRoiGeometry: selectedRoiGeometry?.geometry || null,
                startDate: startDate1,
                endDate: endDate1,
                startDate2,
                endDate2,
                aggregationMethod,
                legendConfig,
              });

              // Add a map layer
              addMapLayer({
                id: generateUUID(),
                layerFunctionType: functionType,
                name: layerName,
                visible: true,
                type: "raster",
                mapStats,
                uhiMetrics,
                roiName: selectedRoiGeometry?.name || "",
              });

              // Add legend
              addLegend(layerName, legendConfig);
            });
            break;
          }

          /////////////////////////////////////////////////////////////////////////
          // Handle RAG QUERY
          /////////////////////////////////////////////////////////////////////////
          case "requestRagQuery": {
            let sources = result.data;
            // sources = sources.map((source: any) => {
            //   source.metada;
            // });
            const citations = transformMetadataToCitations(sources);
            startTransition(() => {
              setMessageResults((prev) => ({
                ...prev,
                [lastMessageId]: {
                  ...prev[lastMessageId],
                  citationSources: citations,
                  toolCallTitle,
                },
              }));
              setChatResponseSources(toolCallId, sources);
            });
            break;
          }

          /////////////////////////////////////////////////////////////////////////
          // Handle DRAFT REPORT
          /////////////////////////////////////////////////////////////////////////
          case "draftReport": {
            const { report, reportFileName } = result;
            startTransition(() => {
              setMessageResults((prev) => ({
                ...prev,
                [lastMessageId]: {
                  ...prev[lastMessageId],
                  draftedReport: report,
                  toolCallTitle,
                  reportFileName,
                },
              }));
            });
            break;
          }
        }
      }
      setPendingResults([]);
    };

    processResults();
  }, [pendingResults, toolCallIdToMessageIdsMap]);

  useEffect(() => {
    let localActiveToolCallId: string | null = null;
    const newToolCallIdToMessageIdsMap: { [key: string]: Set<string> } = {};

    messages.forEach((m) => {
      if (m.role === "user") {
        // Every time user speaks, we start fresh
        localActiveToolCallId = null;
      }

      if (m.toolInvocations && m.toolInvocations.length > 0 && !isLoading) {
        // We have a new tool call sequence starting
        m.toolInvocations.forEach((toolInvocation: ToolInvocation) => {
          const toolCallId = toolInvocation.toolCallId;
          if (!newToolCallIdToMessageIdsMap[toolCallId]) {
            newToolCallIdToMessageIdsMap[toolCallId] = new Set();
          }
          newToolCallIdToMessageIdsMap[toolCallId].add(m.id);
          localActiveToolCallId = toolCallId;
        });
      } else if (m.role === "assistant" && localActiveToolCallId) {
        // This assistant message belongs to the currently active tool call
        newToolCallIdToMessageIdsMap[localActiveToolCallId].add(m.id);
        // If this is the final message in the sequence, reset
        // Adjust this logic depending on how you know when the sequence is done
        localActiveToolCallId = null;
      }
    });

    setToolCallIdToMessageIdsMap(newToolCallIdToMessageIdsMap);
  }, [messages, isLoading]);

  // Add the ROI geometries from the initial messages when a history chat is loaded
  useEffect(() => {
    if (!initialMessages?.length) return;

    initialMessages.forEach((message: any) => {
      if (message.role === "assistant" && message.toolInvocations?.length) {
        message.toolInvocations.forEach((invocation: any) => {
          if (invocation.result && invocation.result.selectedRoiGeometry) {
            const retrievedRoiGeometry = invocation.result.selectedRoiGeometry;
            const { id, name, geometry, source } = retrievedRoiGeometry;
            // Add that geometry to your ROI store
            addRoiGeometry({ id, geometry, name, source });
            addMapLayer({
              id: id,
              name: name,
              visible: true,
              type: "roi",
              layerOpacity: 0.8,
              roiName: null,
            });

            // Set the ROI from the session history: this will notify the map to display the ROI (use-map.ts)
            setRoiGeometryFromSessionHistory(retrievedRoiGeometry);
          }
        });
      }
    });
  }, [initialMessages, addRoiGeometry]);

  const allItems = messages.flatMap((m) => {
    // Add this message to processed messages

    const items: {
      key: string;
      type: "message" | "tool";
      data: any;
      isLoading: boolean;
    }[] = [{ key: m.id, type: "message", data: m, isLoading: isLoading }];

    m.toolInvocations?.forEach((toolInvocation: ToolInvocation) => {
      const toolCallId = toolInvocation.toolCallId;

      if (!(toolInvocation as any).result) {
        items.push({
          key: toolCallId,
          type: "tool",
          data: toolInvocation,
          isLoading: isLoading,
        });
      }
    });

    return items;
  });

  return (
    <div
      className={`flex-grow transition-all duration-300 ${
        isSidebarCollapsed ? "ml-20" : "ml-64"
      }`}
    >
      <div
        className={`
        flex flex-col items-center justify-center h-screen
        overflow-y-scroll w-full p-2
        transition-all duration-500 ease-in-out
        ${isArtifactsSidebarOpen ? "pr-[45vw]" : "pr-0"}
      `}
      >
        <div className="flex flex-col items-center justify-start pt-10 gap-3 w-[400px] md:w-[750px] lg:w-full h-screen">
          {!isChatStarted && initialMessages.length === 0 && (
            <CapabilitiesBanner />
          )}
          <button
            className="fixed top-10 right-10 hover:bg-muted p-2 rounded-xl"
            onClick={handleOpenArtifactsSidebarWithRawMap}
          />
          {/* becomes: */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="fixed top-10 right-10 hover:bg-muted p-2 rounded-xl"
                onClick={handleOpenArtifactsSidebarWithRawMap}
              >
                <IconDeviceAnalytics
                  stroke={1.5}
                  size={30}
                  className="text-foreground/80"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Open Insights viewer</TooltipContent>
          </Tooltip>
          {/* Messages */}
          <div className="w-full" style={{ paddingBottom: `${200}px` }}>
            {allItems.map((item) => {
              if (item.type === "message" || item.type === "tool") {
                if (
                  item.type === "message" &&
                  (!item.data.content || item.data.content.trim() === "")
                ) {
                  return null;
                }

                return (
                  <div className="flex w-full" key={item.key}>
                    <div
                      className={`${
                        item.data.role === "user"
                          ? "justify-center w-full"
                          : "justify-center w-full"
                      } flex mb-3`}
                    >
                      <ChatMessage
                        key={item.key}
                        message={item.data}
                        messageResults={messageResults[item.data.id]}
                      />
                    </div>
                  </div>
                );
              }
              return null;
            })}
            <div ref={messagesEndRef}></div>
          </div>

          {/* Input Box */}
          <div className="w-full flex flex-col gap-4 items-center z-[1000] fade-in fixed bottom-5">
            <ChatInputBox
              onSendMessage={handleSendMessage}
              inputValue={input}
              handleInputChange={handleInputChange}
              handleKeyDown={handleKeyDown}
              isStreaming={isLoading}
            />
          </div>

          <div className="fixed flex justiy-center bottom-0 right-0 w-full z-[10] h-20 bg-background mr-10"></div>
        </div>
      </div>
      <div
        className={`
          fixed right-0 top-0 h-screen w-[660px] z-[2000]
          transform transition-transform duration-500 ease-in-out
          ${isArtifactsSidebarOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <ArtifactsSidebar />
      </div>
    </div>
  );
};

export default React.memo(ChatResponseBox);
