import { openai } from "@ai-sdk/openai";
import { azure } from "@ai-sdk/azure"; // You can also use Azure's hosted GPT models. More info: https://sdk.vercel.ai/providers/ai-sdk-providers
import {
  type Message,
  type CoreUserMessage,
  streamText,
  convertToCoreMessages,
  generateText,
} from "ai";

import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

import { NextResponse } from "next/server";

import { answerQuery } from "@/app/actions/rag-actions";
import {
  getChatById,
  saveChat,
  saveMessages,
} from "@/lib/database/chat/queries";
import { getUsageForUser, getUserRoleAndTier } from "@/lib/database/usage";
import { getPermissionSet } from "@/lib/auth";

import {
  generateUUID,
  sanitizeResponseMessages,
  getMostRecentUserMessage,
  generateTitleFromUserMessage,
  getFormattedDate,
} from "@/features/chat/utils/general-utils";
import {
  calculateGeometryArea,
  checkGeometryAreaIsLessThanThreshold,
} from "@/features/maps/utils/geometry-utils";

// export const maxDuration = 30;

export async function POST(request: Request) {
  const {
    id,
    messages,
    selectedRoiGeometryInChat,
    mapLayersNames,
  }: {
    id: string;
    messages: Array<Message>;
    modelId: string;
    selectedRoiGeometryInChat: any;
    mapLayersNames: string[];
  } = await request.json();

  const supabase = await createClient();
  const { data: authResult, error: authError } = await supabase.auth.getUser();
  if (authError || !authResult?.user) {
    return NextResponse.json({ error: "Unauthenticated!" }, { status: 401 });
  }

  const userId = authResult.user.id;
  // Fetch the user's role + subscription
  const userRoleRecord = await getUserRoleAndTier(userId);
  if (!userRoleRecord) {
    return NextResponse.json(
      { error: "Failed to get role/subscription" },
      { status: 403 }
    );
  }

  const { role, subscription_tier: subscriptionTier } = userRoleRecord;
  const { maxRequests, maxArea } = await getPermissionSet(
    role,
    subscriptionTier
  );
  const usage = await getUsageForUser(userId);
  if (usage.requests_count >= maxRequests) {
    return NextResponse.json(
      { error: "Request limit exceeded" },
      { status: 403 }
    );
  }

  const cookieStore = request.headers.get("cookie");
  const chat = await getChatById(id);

  const coreMessages = convertToCoreMessages(messages);
  const userMessage = getMostRecentUserMessage(coreMessages);

  if (!chat) {
    const generatedTitle = await generateTitleFromUserMessage({
      message: messages[0] as CoreUserMessage,
    });
    await saveChat({ id: id, title: generatedTitle });
  }

  const userMessageId = generateUUID();
  await saveMessages({
    messages: [
      {
        ...userMessage,
        id: userMessageId,
        createdAt: new Date(),
        chatId: id,
      },
    ],
  });

  // System instructions
  const systemInstructions = `You are an AI Assistant specializing in geospatial analytics for climate change. Today is ${getFormattedDate()}.
  Be kind, warm, and professional. Use emojis where appropriate to enhance user experience.
  When user asks for a geospatial analysis, never ask for the location unless you run the analysis and you get a corresponding error. Users provide the name of the region of interest (ROI) layer in the request.
  Always highlight important outputs and provide help in interpreting results. Don't include URLs or legends in your responses.
  Refuse to answer questions irrelevant to geospatial analytics or the platform's context. You have access to several tools. If running a tool fails, don't re-run it. Instead, provide a clear explanation to the user.
  IF USER ASKS FOR DRAFTING REPORTS, YOU SHOULD RUN THE "draftReport" TOOL, AND JUST CONFIRM THE DRAFTING OF THE REPORT. YOU SHOULD NOT EVER DRAFT REPORT IN THE CHAT."
  One of the tools is a RAG query tool that you can use to answer questions you don't know the answer to.
  Before running any geospatial analysis, make sure the layer name doesn't already exist in the map layers. No geospatial analysis is available for the year 2025, so you SHOULD NOT run analysis for 2025 even if the user asks for it.
  When executing analyes (not ragQueryRetrieval, though):
  1. Always provide a clear summary of what was analyzed
  2. Highlight key findings and patterns in the data,
  3. If suitable, tabulate some parts of the results/descriptions.`;

  // Prepend system instructions to the conversation as a separate message for the AI
  const systemMessage = {
    role: "assistant", // Change role to "assistant" to avoid unhandled role errors
    content: systemInstructions,
  };

  // Add the system message at the beginning of the conversation
  const processedMessages = [
    systemMessage,
    ...messages.filter((msg: any) => msg.role !== "system"),
  ] as Array<Message>;

  const result = await streamText({
    model: openai("gpt-4o"),
    // model: azure("gpt-4o"),  // You can also use Azure's hosted GPT models
    maxSteps: 5,
    messages: convertToCoreMessages(processedMessages),
    onFinish: async ({ response }) => {
      if (userId) {
        try {
          const responseMessagesWithoutIncompleteToolCalls =
            sanitizeResponseMessages(response.messages);

          await saveMessages({
            messages: responseMessagesWithoutIncompleteToolCalls.map(
              (message) => {
                const messageId = generateUUID();

                return {
                  id: messageId,
                  chatId: id,
                  draftedReportId: null,
                  role: message.role,
                  content: message.content,
                  createdAt: new Date(),
                };
              }
            ),
          });
        } catch (error) {
          console.error("Failed to save chat");
        }
      }
    },

    tools: {
      requestGeospatialAnalysis: {
        description: `Today is ${getFormattedDate()}, so you should be able to help the user with requests by up to this date. No analysis should be done for the year of 2025 as analyses are not yet ready for the new year.
          After running an analysis: 1. Provide a clear summary of what was analyzed and why, 2. Explain the key findings and their significance. NEVER PROVIDE MAP URLs or MAP LEGENDS FROM THE ANALYSES IN THE RESPONSE. Also the maximum area the user can request analysis for is ${maxArea} sq km. per request.
          It should be noted that the land cover map (start date: 2015) and bi-temporal land cover change map (start date: 2015) are based on Sentinel-2 imagery, UHI (start date: 2015) is based on Landsat imagery. For all "CHANGE" maps, the user must provide "startDate2 and endDate2". If in doubt about an analysis (e.g., it may not exactly match the analysis we have), you have to double check with the user.`,
        parameters: z.object({
          functionType: z.string()
            .describe(`The type of analysis to execute. It can be one of the following:
            'Urban Heat Island (UHI) Analysis',
            'Land Use/Land Cover Maps',
            'Land Use/Land Cover Change Maps'.`),
          startDate1String: z
            .string()
            .describe(
              "The start date for the first period. The date format should be 'YYYY-MM-DD'. But convert any other date format the user gives you to that one."
            ),
          endDate1String: z
            .string()
            .describe(
              "The end date for the first period. The date format should be 'YYYY-MM-DD'. But convert any other date format the user gives you to that one."
            ),
          startDate2String: z
            .string()
            .optional()
            .describe(
              "The start date for the second period. The date format should be 'YYYY-MM-DD'. But convert any other date format the user gives you to that one."
            ),
          endDate2String: z
            .string()
            .optional()
            .describe(
              "The end date for the second period. The date format should be 'YYYY-MM-DD'. But convert any other date format the user gives you to that one."
            ),
          aggregationMethod: z.string().describe(
            `The method to use for aggregating the data. It means that in a time-series, what method is used to aggregate data for a given point/pixel in the final map/analysis delivered. For land use/land cover mapping, it's always "Median", and thus you don't need to ask user for that. It can be one of the following:
            'Mean',
            'Median',
            'Min',
            'Max',
            . Note that the user may not provide it, so by default its value should be 'Max', and you should not ask the user to tell you what method to use. If the default value is used, make sure to mention it in the response to user that your analysis is based on the maximum va.
          `
          ),
          layerName: z
            .string()
            .describe(
              "The name of the layer to be displayed. You ask the user about it if they don't provide it. Otherwise, use a name based on the function type, but make sure the name is concise and descriptive. "
            ),
          title: z
            .string()
            .optional()
            .describe(
              "Briefly describe the title of the analysis in one sentence confirming you're working on the user's request."
            ),
        }),
        execute: async (args) =>
          requestGeospatialAnalysis({
            ...args,
            cookieStore,
            selectedRoiGeometryInChat,
            maxArea,
          }),
      },
      requestRagQuery: {
        description: `The user has some documents with which a RAG has been built. If you're asked a question that you didn't know the answer, run the requestRagQuery tool that is based on user's documents to get the answer.`,
        parameters: z.object({
          query: z.string().describe("The user's query text."),
          title: z
            .string()
            .optional()
            .describe(
              "Briefly describe the title of the analysis in one sentence confirming you're working on the user's request."
            ),
        }),
        execute: async (args) => requestRagQuery({ ...args, cookieStore }),
      },
      draftReport: {
        description: `When this tool is called, draft a report that summarizes the analyses and their results. The report should be concise and easy to understand, highlighting the key findings and insights. Markdown is supported.`,
        parameters: z.object({
          messages: z
            .array(z.object({}))
            .describe(
              "The messages exchanged between the user and the you. You should use relevant messages in the chat to generate the report the user requested. Make sure you format the report in a standard way with all the common structures."
            ),
          title: z
            .string()
            .optional()
            .describe(
              "Briefly describe the title of the report to be drafted in one sentence confirming you're working on the user's request."
            ),
          reportFileName: z
            .string()
            .optional()
            .describe("Provide a concise name for the report file."),
        }),
        execute: async (args) =>
          draftReport({ ...args, messages: processedMessages }),
      },
      checkMapLayersNames: {
        description:
          "Your need to select a name for the geospatial analysis to be performed. Here are the the names of the current map layers. If you run a geospatial analysis, and you select a name fo the layer, you should should first check the layer names to make sure the name you selected is not already in use.",
        parameters: z.object({
          layerName: z
            .string()
            .describe("The name of the layer to be displayed."),
        }),

        execute: async (args) => {
          return mapLayersNames;
        },
      },
    },
  });

  return result.toDataStreamResponse();
}

///////////////////////////////////////////////////////////////
// Implement the tools
///////////////////////////////////////////////////////////////

// Tool to request a geospatial analysis
async function requestGeospatialAnalysis(args: any) {
  const {
    functionType,
    startDate1String,
    endDate1String,
    startDate2String,
    endDate2String,
    aggregationMethod,
    layerName,
    title,
    cookieStore,
    selectedRoiGeometryInChat,
    maxArea,
  } = args;

  const selectedRoiGeometry = selectedRoiGeometryInChat?.geometry;
  if (!selectedRoiGeometry) {
    return {
      error:
        "It seems you didn't provide a valid region of interest (ROI) for the analysis. you need to provide an ROI through importing a shapefile/geojson file or drawing a shape on the map.",
    };
  }

  if (
    selectedRoiGeometry.type !== "Polygon" &&
    selectedRoiGeometry.type !== "MultiPolygon" &&
    selectedRoiGeometry.type !== "FeatureCollection"
  ) {
    return {
      error:
        "Selected ROI geometry must be a Polygon, MultiPolygon, or a FeatureCollection of polygons.",
    };
  }

  // If it's a FeatureCollection, ensure every feature's geometry is a Polygon or MultiPolygon.
  if (selectedRoiGeometry.type === "FeatureCollection") {
    for (const feature of selectedRoiGeometry.features) {
      if (
        !feature.geometry ||
        (feature.geometry.type !== "Polygon" &&
          feature.geometry.type !== "MultiPolygon")
      ) {
        return {
          error: "All features in the ROI must be polygons.",
        };
      }
    }
  }

  const geometryAreaCheckResult = checkGeometryAreaIsLessThanThreshold(
    selectedRoiGeometryInChat?.geometry,
    maxArea
  );
  const areaSqKm = calculateGeometryArea(selectedRoiGeometryInChat?.geometry);
  if (!geometryAreaCheckResult) {
    return {
      error: `The area of the selected region of interest (ROI) is ${areaSqKm} sq km, which exceeds the maximum area limit of ${maxArea} sq km. Please select a smaller ROI and try again.`,
    };
  }

  const url = new URL(
    "/api/gee/request-geospatial-analysis",
    process.env.BASE_URL
  );

  const payload = {
    functionType,
    startDate1: startDate1String,
    endDate1: endDate1String,
    startDate2: startDate2String,
    endDate2: endDate2String,
    aggregationMethod,
    selectedRoiGeometry,
  };

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: cookieStore || "",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(
        "Error during fetch:",
        errorData.error || response.statusText
      );
      return NextResponse.json(
        { error: "Failed to run the analysis" },
        { status: 500 }
      );
    }

    const data = await response.json();

    // This is not suitable for production, but it's a good way to check if the response is correct
    if (Object.keys(data.mapStats).length === 0) {
      return {
        error: "Something went wrong! Failed to run the analysis.",
      };
    }
    return {
      ...data,
      title,
      layerName,
      functionType,
      startDate1: startDate1String,
      endDate1: endDate1String,
      startDate2: startDate2String,
      endDate2: endDate2String,
      aggregationMethod,
      selectedRoiGeometry: selectedRoiGeometryInChat,
    };
  } catch (error) {
    console.error("Error during fetch:", error);
    return NextResponse.json(
      { error: "Failed to run the analysis" },
      { status: 500 }
    );
  }
}

// Tool to request a RAG query
async function requestRagQuery(args: any) {
  const { query, title } = args; // Extract query parameter from arguments

  try {
    const data = await answerQuery(query);

    return { data, title };
  } catch (error) {
    console.error("Error during RAG fetch:", error);
    return NextResponse.json({ error: "Failed to fetch RAG" }, { status: 500 });
  }
}

// Tool to generate a report based on the conversation history
async function draftReport(args: any) {
  try {
    const { messages, title, reportFileName } = args;

    const relevantMessages = messages.filter(
      (msg: any) =>
        msg.role === "user" ||
        (msg.role === "assistant" &&
          !msg.content.startsWith("You are an AI Assistant"))
    );

    // Create a prompt that focuses on synthesizing the existing conversation
    const reportPrompt = {
      role: "user",
      content: `Please draft a comprehensive report based on our previous conversation and analyses. The report should NOT inlcude your own comments.
          Format it with the following structure:
          - Introduction: Brief context and purpose
          - Analyses Performed: Summary of conducted analyses
          - Key Findings: Important results, patterns, and trends
          - Limitations and Caveats: Important constraints
          - Recommendations & Next Steps: Future suggestions."`,
    };

    // Use all relevant conversation history plus the report request
    const conversationContext = [...relevantMessages, reportPrompt];

    const reportResponse = await generateText({
      model: openai("gpt-4o"),
      // model: azure("gpt-4o"),
      messages: convertToCoreMessages(conversationContext),
      tools: {}, // Empty tools object since we don't need tools for report generation
    });

    // For simplicity here, assume it's resolved into a single string once complete.
    const report = await reportResponse.text;

    return {
      report,
      title,
      reportFileName,
    };
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to draft report" },
      { status: 500 }
    );
  }
}
