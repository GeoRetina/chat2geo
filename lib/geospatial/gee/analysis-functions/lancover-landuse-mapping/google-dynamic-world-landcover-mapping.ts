"use server";
import ee from "@google/earthengine";
import { evaluate, getMapId } from "@/features/maps/utils/gee-eval-utils";
import { createClient } from "@/utils/supabase/server";

interface LegendConfig {
  labelNames: string[];
  palette: string[];
}

interface DynamicWorldResult {
  urlFormat: string;
  geojson: any;
  legendConfig: LegendConfig;
  mapStats: Record<string, string>;
  extraDescription: string;
}

export default async function googleDynamicWorldMapping(
  geometry: any,
  startDate: string,
  endDate: string
): Promise<DynamicWorldResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error("Unauthenticated!");
  }

  const dynamicWorld = ee
    .ImageCollection("GOOGLE/DYNAMICWORLD/V1")
    .filterBounds(geometry)
    .filterDate(startDate, endDate)
    .select("label")
    .mode()
    .clip(geometry);

  const labelNames: string[] = [
    "Water",
    "Trees",
    "Grass",
    "Flooded Vegetation",
    "Crops",
    "Shrub & Scrub",
    "Built Area",
    "Bare Ground",
    "Snow & Ice",
  ];

  const palette: string[] = [
    "#419BDF", // Water
    "#397D49", // Trees
    "#88B053", // Grass
    "#7A87C6", // Flooded Vegetation
    "#E49635", // Crops
    "#DFC35A", // Shrub & Scrub
    "#C4281B", // Built Area
    "#A59B8F", // Bare Ground
    "#D1DDF9", // Snow & Ice
  ];

  const classOccurrences = dynamicWorld
    .reduceRegion({
      reducer: ee.Reducer.frequencyHistogram(),
      geometry,
      scale: 30,
      tileScale: 16,
      maxPixels: 1e100,
      bestEffort: true,
    })
    .get("label");

  let mapStats: Record<string, string> = {};

  await classOccurrences.evaluate((histogram: { [key: string]: number }) => {
    if (!histogram) {
      mapStats = {};
      return;
    }

    const total = Object.values(histogram).reduce(
      (sum, count) => sum + count,
      0
    );

    // Convert raw counts to percentages
    mapStats = Object.fromEntries(
      Object.entries(histogram).map(([key, value]) => {
        const labelIndex = parseInt(key, 10);
        const className = labelNames[labelIndex] ?? `Class_${key}`;
        const percentage = ((value / total) * 100).toFixed(2);
        return [className, percentage];
      })
    );
  });

  const visualization = {
    min: 0,
    max: 8,
    palette,
  };

  const { urlFormat } = (await getMapId(dynamicWorld, visualization)) as any;
  const imageGeom = dynamicWorld.geometry();
  const imageGeometryGeojson = await evaluate(imageGeom);

  return {
    urlFormat,
    geojson: imageGeometryGeojson,
    legendConfig: { labelNames, palette },
    mapStats,
    extraDescription: ``,
  };
}
