////////////////////////////////////////////////////////////
// 1. Module Declarations
////////////////////////////////////////////////////////////

declare module "@google/earthengine" {
  const ee: any;
  export default ee;
}

////////////////////////////////////////////////////////////
// 2. Type Definitions
////////////////////////////////////////////////////////////

/**
 * Multi-Analysis Related Types
 */
type MultiAnalysisOptionsType =
  | "Aerosols"
  | "Flood Risk"
  | "Urban Heat Island (UHI)"
  | "CO"
  | "NO2"
  | "CH4";

type MultiAnalysisFunctionNames =
  | "Air Pollutants Analysis"
  | "Vulnerability Map Builder";

type MultiAnalysisOptionsTypeForVulnerabilityMapBuilderType =
  | "Air Pollutants"
  | "Flood Risk"
  | "Urban Heat Island (UHI)";

type MultiAnalysisOptionsTypeForAirPollutantsAnalysisType =
  | "CO"
  | "NO2"
  | "CH4"
  | "Aerosols";

type AirPollutantsUnits = "mol/m²" | "ppm" | "ppb" | "index";

/**
 * MultiAnalysis Configuration Types
 */
type MultiAnalysisFunctionsConfigType = {
  roiFieldRequired: boolean;
  aggregationMethodRequired: boolean;
  biTemporalOptions: boolean;
  options: { name: string; description: string }[];
  optionsHeader: string;
  optionsWeights?: { [key: string]: number }[];
};

/**
 * Aggregation Methods
 */
type AggregationMethodType =
  | "Median"
  | "Mean"
  | "Max"
  | "Min"
  | "Mode"
  | "90th Percentile";

type AggregationMethodTypeCategorical = "Mode" | "90th Percentile";

type AggregationMethodTypeNumerical = "Mean" | "Median" | "Max" | "Min";

/**
 * AI Assistants
 */
type AI_ASSISTANTS_TYPE = {
  default: string[];
  custom: string[];
  icons: { [key: string]: string };
};

/**
 * Basemaps
 */
type BasemapType = "satellite" | "osm";

/**
 * Citation Badge
 */
type CitationBadgeProps = {
  citations: string[];
  citationSource:
    | "uploadedDocument"
    | "OneDrive"
    | "GDrive"
    | "Notion"
    | "Confluence";
};

/**
 * UHIMetrics
 */
type UHIMetrics = UHIMetric[];

/**
 * Document Processing
 */
type ProcessDocumentFileProps = {
  file: File;
  folderId: string | null;
};

/**
 * Menu Position
 */
type MenuPosition = {
  top: number;
  left: number;
  caret: number;
};

/**
 * Service Types & Status
 */
type ServiceType =
  | "arcgis"
  | "google-drive"
  | "microsoft-onedrive"
  | "notion"
  | "confluence"
  | "postgresql"
  | "aws-s3";

type ServiceStatus = "connected" | "not_connected";

////////////////////////////////////////////////////////////
// 3. Interface Definitions
////////////////////////////////////////////////////////////

/**
 * Multi Analysis Settings Modal
 */
interface MultiAnalysisSettingsModalProps {
  functionName: string;
  optionsConfig: MultiAnalysisFunctionsConfigType;
}

/**
 * UHI Metric
 */
interface UHIMetric {
  Metric: string;
  Value: number;
  Unit: string;
  Description: string;
}

/**
 * GEE Output
 */
interface GeeOutputItem {
  layerName: string;
  urlFormat: string | undefined;
  legendConfig: any;
  mapStats: Record<string, any>;
  uhiMetrics: UHIMetrics | null;
}

/**
 * Source (for citations)
 */
interface Source {
  documentName: string;
  pages: Page[];
}

/**
 * Legend Config
 */
interface LegendConfig {
  labelNames: string[];
  labelNamesStats?: string[];
  palette: string[];
  statsPalette?: string[];
}

/**
 * Geospatial Analysis Result
 */
interface GeospatialAnalysisResult {
  urlFormat?: string;
  legendConfig?: any;
  mapStats?: any;
  layerName?: string;
  uhiMetrics?: any;
  functionType?: string;
}

/**
 * Tool Calling Message Results
 */
interface ToolCallingMessageResults {
  geospatialAnalysis?: GeospatialAnalysisResult;
  citationSources?: Source[];
  draftedReport?: string;
  toolCallTitle?: string;
  reportFileName?: string;
}

/**
 * Chat History
 */
interface ChatHistory {
  chatId: string;
  title: string;
  createdAt: string;
}

/**
 * Chat Response Box
 */
interface ChatResponseBoxProps {
  chatId: string;
  initialMessages: any;
}

/**
 * Table Column
 */
interface TableColumn<T> {
  key: keyof T;
  header: string;
  width?: string;
  render?: (value: any, item: T) => React.ReactNode;
}

/**
 * User
 */
interface User {
  id: number;
  name: string;
  createdAt: string;
}

/**
 * Document File
 */
interface DocumentFile {
  id?: number | undefined;
  name: string;
  owner: string;
  numberOfPages?: number | undefined;
  folder_id: string | null;
  created_at?: Date | undefined;
}

/**
 * Table Action
 */
interface TableAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: T) => void;
  className?: string;
}

/**
 * Text Editor Props
 */
interface TextEditorProps {
  inputText?: string;
}

/**
 * Chat Input Box
 */
interface ChatInputBoxProps {
  onSendMessage: () => void;
  inputValue: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isStreaming: boolean;
}

/**
 * ROI Geometry
 */
interface ROIGeometry {
  id: string;
  name: string;
  geometry: any;
  source: "drawn" | "arcgis" | "attached";
}

/**
 * Integration Service
 */
interface IntegrationService {
  id: ServiceType;
  name: string;
  description: string;
  icon: string;
  status: ServiceStatus;
  lastSync?: string;
}

/**
 * Feature
 */
interface Feature {
  UID: string;
  maplibreFeatureId?: string;
  geometry: "Point" | "Polygon";
  drawnFeatureName: string;
  lat?: number;
  lon?: number;
  coordinates?: number[][][];
  query?: any;
  rasterLayerName: string;
  [key: string]: any;
}

/**
 * ArcGIS Layer
 */
interface ArcGISLayer {
  name: string;
  type: string;
  url: string;
  data_url?: string;
}

/**
 * Map Layer
 */
interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  type: "raster" | "roi";
  layerOpacity?: number;
  mapStats?: Record<string, any>;
  uhiMetrics?: UHIMetrics | null;
  layerFunctionType?: string;
  roiName: string | null;
}
