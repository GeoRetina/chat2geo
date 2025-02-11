import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { geeAuthenticate } from "@/features/maps/utils/authentication-utils/gee-auth";
import { urbanHeatIslandAnalysis } from "@/lib/geospatial/gee/analysis-functions/heat-analysis/urban-heat-island-analysis";
import { airPollutionAnalysis } from "@/lib/geospatial/gee/analysis-functions/pollution-analysis/air-pollution-analysis";
import { sentinelLandcoverLanduseMapping } from "@/lib/geospatial/gee/analysis-functions/lancover-landuse-mapping/sentinel-landcover-landuse-mapping";
import { convertToEeGeometry } from "@/features/maps/utils/geometry-utils";
import googleDynamicWorldMapping from "@/lib/geospatial/gee/analysis-functions/lancover-landuse-mapping/google-dynamic-world-landcover-mapping";
import landcoverChangeMapping from "@/lib/geospatial/gee/analysis-functions/lancover-landuse-mapping/landcover-change-mapping";

const validAnalysisOptionsForVulnerabilityMapBuilder: MultiAnalysisOptionsTypeForVulnerabilityMapBuilderType[] =
  ["Air Pollutants", "Flood Risk", "Urban Heat Island (UHI)"];
const validAnalysisOptionsForAtmosphericGasAnalysis: MultiAnalysisOptionsTypeForAirPollutantsAnalysisType[] =
  ["CO", "NO2", "CH4", "Aerosols"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return NextResponse.json({ error: "Unauthenticated!" }, { status: 401 });
  }

  // Parse the request body as JSON
  let body;
  try {
    body = await req.json();
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    functionType,
    selectedRoiGeometry,
    aggregationMethod,
    startDate1,
    endDate1,
    startDate2,
    endDate2,
    multiAnalysisOptions,
  } = body;

  // Validate the ROI geometry
  if (!selectedRoiGeometry) {
    return NextResponse.json(
      {
        error:
          "No Region of Interest (ROI) was provided. Please provide an ROI.",
      },
      { status: 400 }
    );
  }

  // If the geometry comes in as a string, decode and parse it
  let geometry = selectedRoiGeometry;
  if (typeof selectedRoiGeometry === "string") {
    try {
      const geometryString = decodeURIComponent(selectedRoiGeometry);
      geometry = JSON.parse(geometryString);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid geometry JSON" },
        { status: 400 }
      );
    }
  }

  try {
    await initializeGee();

    const eeReadyGeometry = convertToEeGeometry(geometry);

    let result;
    switch (functionType) {
      case "Air Pollution Analysis":
        if (
          multiAnalysisOptions.every((option: any) =>
            validAnalysisOptionsForAtmosphericGasAnalysis.includes(
              option as MultiAnalysisOptionsTypeForAirPollutantsAnalysisType
            )
          )
        ) {
          result = await airPollutionAnalysis(
            geometry,
            multiAnalysisOptions as MultiAnalysisOptionsTypeForAirPollutantsAnalysisType[],
            startDate1,
            endDate1,
            aggregationMethod as AggregationMethodTypeNumerical,
            startDate2,
            endDate2
          );
        } else {
          throw new Error(
            "Invalid analysis option for Air Pollutants Analysis"
          );
        }
        break;
      case "Land Use/Land Cover Maps":
        result = await googleDynamicWorldMapping(
          eeReadyGeometry,
          startDate1,
          endDate1
        );
        break;

      case "Land Use/Land Cover Change Maps":
        result = await landcoverChangeMapping(
          eeReadyGeometry,
          startDate1,
          endDate1,
          startDate2,
          endDate2
        );
        break;

      case "Urban Heat Island (UHI) Analysis":
        result = await urbanHeatIslandAnalysis(
          eeReadyGeometry,
          startDate1,
          endDate1,
          aggregationMethod as AggregationMethodTypeNumerical
        );
        break;

      default:
        throw new Error("Invalid function type");
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ result: error.message }, { status: 404 });
  }
}

// Function to initialize Google Earth Engine
const initializeGee = async () => {
  await geeAuthenticate();
};
