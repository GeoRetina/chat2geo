"use server";
import ee from "@google/earthengine";
import { evaluate, getMapId } from "@/features/maps/utils/gee-eval-utils";
import { createClient } from "@/utils/supabase/server";

interface LandCoverChangeResult {
  urlFormat: string;
  geojson: any;
  legendConfig: any;
  mapStats: Record<string, any>;
  extraDescription: string;
}

// The 9 DW classes for "label" interpretation
const DW_LABELS = [
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

// The 9 DW palette colors
const DW_PALETTE = [
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

const PROB_THRESHOLD = 0.5;

/**
 * Compute class distribution (0..8 => class names)
 */
async function computeClassDistribution(
  image: any,
  geometry: any
): Promise<Record<string, string>> {
  const histogram = image
    .reduceRegion({
      reducer: ee.Reducer.frequencyHistogram(),
      geometry,
      scale: 10,
      maxPixels: 1e13,
    })
    .get("label");

  return new Promise((resolve) => {
    histogram.evaluate((result: { [key: string]: number }) => {
      if (!result) return resolve({});
      const totalPixels = Object.values(result).reduce(
        (sum, val) => sum + val,
        0
      );
      if (totalPixels === 0) return resolve({});

      const distribution: Record<string, string> = {};
      Object.entries(result).forEach(([classIndexStr, count]) => {
        const classIndex = parseInt(classIndexStr, 10);
        const className =
          DW_LABELS[classIndex] ?? `UnknownClass_${classIndexStr}`;
        const pct = ((count / totalPixels) * 100).toFixed(2);
        distribution[className] = pct;
      });

      resolve(distribution);
    });
  });
}

/**
 * Returns:
 * 1) A tile for changed (1) vs. unchanged (0).
 * 2) mapStats with changed/unchanged percentages + class distributions.
 */
export default async function landcoverChangeMapping(
  geometry: any,
  startDate1: string,
  endDate1: string,
  startDate2: string,
  endDate2: string
): Promise<LandCoverChangeResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error("Unauthenticated!");
  }

  // 2) Filter the Dynamic World collection with a probability mask.
  const fromCollection = ee
    .ImageCollection("GOOGLE/DYNAMICWORLD/V1")
    .filterBounds(geometry)
    .filterDate(startDate1, endDate1)
    .map((img: any) => {
      const probBands = img.select([
        "water",
        "trees",
        "grass",
        "flooded_vegetation",
        "crops",
        "shrub_and_scrub",
        "built",
        "bare",
        "snow_and_ice",
      ]);
      const maxProb = probBands.reduce(ee.Reducer.max());
      return img.updateMask(maxProb.gte(PROB_THRESHOLD));
    });

  const toCollection = ee
    .ImageCollection("GOOGLE/DYNAMICWORLD/V1")
    .filterBounds(geometry)
    .filterDate(startDate2, endDate2)
    .map((img: any) => {
      const probBands = img.select([
        "water",
        "trees",
        "grass",
        "flooded_vegetation",
        "crops",
        "shrub_and_scrub",
        "built",
        "bare",
        "snow_and_ice",
      ]);
      const maxProb = probBands.reduce(ee.Reducer.max());
      return img.updateMask(maxProb.gte(PROB_THRESHOLD));
    });

  // 3) Create mode images for each period
  const fromImage = fromCollection.select("label").mode().clip(geometry);
  const toImage = toCollection.select("label").mode().clip(geometry);

  // 4) Build changed vs. unchanged image (0 => same, 1 => different)
  const changeImage = fromImage.neq(toImage).rename("label");

  // 5) Frequency histogram (changed vs. unchanged)
  const changeHistogram = changeImage
    .reduceRegion({
      reducer: ee.Reducer.frequencyHistogram(),
      geometry,
      scale: 10,
      maxPixels: 1e13,
    })
    .get("label");

  let changedPct = "0.0";
  let unchangedPct = "0.0";

  await changeHistogram.evaluate((histogram: { [key: string]: number }) => {
    if (!histogram) return;
    const changedCount = histogram["1"] || 0;
    const unchangedCount = histogram["0"] || 0;
    const total = changedCount + unchangedCount;
    if (total > 0) {
      changedPct = ((changedCount / total) * 100).toFixed(2);
      unchangedPct = ((unchangedCount / total) * 100).toFixed(2);
    }
  });

  // 6) Compute distributions
  const [year1Distribution, year2Distribution] = await Promise.all([
    computeClassDistribution(fromImage, geometry),
    computeClassDistribution(toImage, geometry),
  ]);

  // 7) Visualization (0 => gray, 1 => red)
  const palette = ["#aaaaaa", "#ff0000"];
  const visualization = {
    min: 0,
    max: 1,
    palette,
  };

  // 8) Build tile & geometry
  const { urlFormat } = (await getMapId(changeImage, visualization)) as any;
  const imageGeom = changeImage.geometry();
  const imageGeometryGeojson = await evaluate(imageGeom);

  // 9) Minimal legend for changed vs. unchanged
  const legendConfig: any = {
    labelNames: ["Unchanged", "Changed"],
    labelNamesStats: DW_LABELS,
    palette: palette,
    statsPalette: DW_PALETTE,
  };

  // 10) Combine stats
  const mapStats = {
    changedPercentage: changedPct,
    unchangedPercentage: unchangedPct,
    year1Distribution,
    year2Distribution,
  };

  return {
    urlFormat,
    geojson: imageGeometryGeojson,
    legendConfig,
    mapStats,
    extraDescription: `Extra info the user needs to know: detected class values with a probability threshold less than ${PROB_THRESHOLD} were masked out.`,
  };
}
