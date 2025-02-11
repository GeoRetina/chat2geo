"use client";

import React, { useEffect, useState } from "react";
import selectChartType from "@/features/charts/utils/select-chart-type";
import usePlotReadyDataFromVectorLayerStore from "@/features/maps/stores/plots-stores/usePlotReadyFromVectorLayerStore";
import Chart from "./charts";
import useLayerSelectionStore from "@/features/maps/stores/use-layer-selection-store";
import useMapLayersStore from "@/features/maps/stores/use-map-layer-store";
import isEqual from "lodash.isequal";
import useFunctionStore from "@/features/maps/stores/use-function-store";
import useMapDisplayStore from "@/features/maps/stores/use-map-display-store";

/////////////// *****For Stats Display***** //////////////////////
interface ChartStatsDisplayProps {
  layerName: string;
  mapStats: any;
  uhiMetrics?: any;
  legendConfig: any;
  functionType: string;
}
export const ChartStatsDisplay = ({
  layerName,
  mapStats,
  functionType,
  legendConfig,
}: ChartStatsDisplayProps) => {
  const handleSelectChartType = selectChartType();
  const [palette, setPalette] = useState<any>(null);

  if (layerName && mapStats) {
    const chartType = handleSelectChartType(functionType);
    // Set palette based on the chart type if necessary
    if (
      chartType.queryChart === "barChartPercentage" ||
      chartType.queryChart === "stackedBarChartForLandcoverChangeMaps"
    ) {
      const newPalette = {
        labels: legendConfig?.labelNamesStats || legendConfig?.labelNames,
        palette: legendConfig?.statsPalette || legendConfig?.palette,
      };

      if (!isEqual(palette, newPalette)) {
        setPalette(newPalette);
      }
    } else {
      if (palette !== null) {
        setPalette(null);
      }
    }
  }

  return (
    <div
      className="flex flex-col justify-center items-center h-full w-full overflow-hidden gap-2 bg-secondary/20 rounded-xl border border-stone-300 dark:border-stone-600
    "
    >
      {(() => {
        const chartType = handleSelectChartType(functionType);

        switch (chartType.statsChart) {
          case "boxplotTimeseries":
            return (
              <Chart
                data={mapStats}
                chartType="boxplotTimeseries"
                chartTitle={layerName}
                palette={palette}
              />
            );
          case "pieChartPercentage":
            return (
              <Chart
                data={mapStats}
                chartType="pieChartStats"
                chartTitle={layerName}
                palette={palette}
              />
            );
          case "barChartStats":
            return (
              <Chart
                data={mapStats}
                chartType="barChartStats"
                chartTitle={layerName}
                palette={palette}
              />
            );
          case "stackedBarChartStats":
            return (
              <Chart
                data={mapStats}
                chartType="stackedBarChartStats"
                chartTitle={layerName}
                palette={palette}
              />
            );
          case "stackedPercentageBarChartStats":
            return (
              <Chart
                data={mapStats}
                chartType="stackedPercentageBarChartStats"
                chartTitle={layerName}
                palette={palette}
              />
            );
          case "combinedStackedBarChartStats":
            return (
              <Chart
                data={mapStats}
                chartType="combinedStackedBarChartStats"
                chartTitle={layerName}
                palette={palette}
              />
            );
          case "stackedBarChartForLandcoverChangeMaps":
            return (
              <Chart
                data={{
                  year1Distribution: mapStats.year1Distribution,
                  year2Distribution: mapStats.year2Distribution,
                }}
                chartType="stackedBarChartForLandcoverChangeMaps"
                chartTitle={layerName}
                palette={palette}
              />
            );
          default:
            return <div />;
        }
      })()}
    </div>
  );
};

ChartStatsDisplay.displayName = "ChartStatsDisplay";

/////////////// *****For Query Display***** //////////////////////
export const ChartQueryDisplay = React.memo(() => {
  const handleSelectChartType = selectChartType();
  const [selectedChartType, setSelectedChartType] = useState("");
  const [selectedChartUnit, setSelectedChartUnit] = useState("");
  const {
    plotReadyDataForSelectedAreaOnMap,
    setPlotReadyDataForSelectedAreaOnMap,
  } = usePlotReadyDataFromVectorLayerStore();
  const { removeLayerSignal } = useMapLayersStore();
  const selectedRasterLayer = useLayerSelectionStore(
    (state) => state.selectedRasterLayer
  );
  const getFunctionConfig = useFunctionStore(
    (state) => state.getFunctionConfig
  );
  const [queryIsReady, setQueryIsReady] = useState(false);
  const [data, setData] = useState<any | null>(null);

  const [isSelectedAreaOnMapUpdated, setIsSelectedAreaOnMapUpdated] =
    useState(false);

  const [palette, setPalette] = useState<any>(null);

  const toggleMapChartPanel = useMapDisplayStore(
    (state) => state.toggleMapChartPanel
  );
  const isMapChartPanelOpen = useMapDisplayStore(
    (state) => state.isMapChartPanelOpen
  );

  useEffect(() => {
    if (isMapChartPanelOpen) {
      setQueryIsReady(true);
    } else {
      setQueryIsReady(false);
      setData(null);
    }
  }, [isMapChartPanelOpen]);

  // For Selected Point on Map
  useEffect(() => {
    if (
      plotReadyDataForSelectedAreaOnMap.data &&
      selectedRasterLayer.layerName
    ) {
      const functionConfig = getFunctionConfig(selectedRasterLayer.layerName);
      const legendConfig = functionConfig?.legendConfig;

      setData(plotReadyDataForSelectedAreaOnMap.data);
      const functionType = functionConfig?.functionType;
      const newChartType = handleSelectChartType(functionType as string);
      setPalette({
        labels: legendConfig?.labelNamesStats || legendConfig?.labelNames,
        palette: legendConfig?.statsPalette || legendConfig?.palette,
      });
      setSelectedChartType(newChartType.queryChart);
      setSelectedChartUnit(newChartType?.unit || "");

      if (!isMapChartPanelOpen) {
        toggleMapChartPanel();
      }

      if (isSelectedAreaOnMapUpdated) {
        setIsSelectedAreaOnMapUpdated(false);
      }
    }
  }, [isSelectedAreaOnMapUpdated, plotReadyDataForSelectedAreaOnMap.data]);

  useEffect(() => {
    if (removeLayerSignal === selectedRasterLayer.layerName) {
      setPlotReadyDataForSelectedAreaOnMap(null, "");
      setData(null);
    }
  }, [removeLayerSignal]);

  return (
    <>
      {(() => {
        if (
          (data?.outputsFromMap?.monoTemporalQueryValues?.length > 0 ||
            data?.outputsFromMap?.biTemporalQueryValues?.length > 0 ||
            (data?.outputsFromMap?.monoTemporalQueryValues &&
              Object.values(data?.outputsFromMap?.monoTemporalQueryValues).some(
                (value) => value != null
              )) ||
            data?.outputsFromMap?.length > 0) &&
          queryIsReady
        ) {
          return (
            <div className="flex h-full w-full overflow-hidden ">
              <Chart
                data={
                  data?.outputsFromMap?.biTemporalQueryValues?.length > 0
                    ? {
                        year1Distribution:
                          data?.outputsFromMap?.biTemporalQueryValues[0]
                            .year1Distribution,
                        year2Distribution:
                          data?.outputsFromMap?.biTemporalQueryValues[0]
                            .year2Distribution,
                      }
                    : data?.outputsFromMap
                }
                chartType={selectedChartType}
                chartTitle={"Aggregated Query"}
                palette={palette}
                chartUnit={selectedChartUnit}
              />
            </div>
          );
        } else if (data?.outputsFromMap?.length === 0 && queryIsReady) {
          return (
            <div className="flex items-center justify-center w-full h-full">
              <p>No Data Available for this location</p>
            </div>
          );
        }
      })()}
    </>
  );
});

ChartQueryDisplay.displayName = "ChartQueryDisplay";

/////////////// *****For Time-Series Query Display***** //////////////////////

export const ChartTimeseriesQueryDisplay = React.memo(() => {
  const handleSelectChartType = selectChartType();
  const [selectedChartType, setSelectedChartType] = useState("");
  const [selectedChartUnit, setSelectedChartUnit] = useState("");
  const {
    plotReadyDataForSelectedAreaOnMap,
    setPlotReadyDataForSelectedAreaOnMap,
  } = usePlotReadyDataFromVectorLayerStore();
  const { removeLayerSignal } = useMapLayersStore();
  const selectedRasterLayer = useLayerSelectionStore(
    (state) => state.selectedRasterLayer
  );
  const [queryIsReady, setQueryIsReady] = useState(false);

  const [data, setData] = useState<any | null>(null);

  const [isSelectedAreaOnMapUpdated, setIsSelectedAreaOnMapUpdated] =
    useState(false);

  const isMapChartPanelOpen = useMapDisplayStore(
    (state) => state.isMapChartPanelOpen
  );

  const [palette, setPalette] = useState<any>(null);
  const getFunctionConfig = useFunctionStore(
    (state) => state.getFunctionConfig
  );

  // For Selected Point on Map
  useEffect(() => {
    if (
      plotReadyDataForSelectedAreaOnMap.data &&
      selectedRasterLayer.layerName
    ) {
      setData(plotReadyDataForSelectedAreaOnMap.data);
      const functionConfig = getFunctionConfig(selectedRasterLayer.layerName);
      const legendConfig = functionConfig?.legendConfig;

      setData(plotReadyDataForSelectedAreaOnMap.data);
      const functionType = functionConfig?.functionType;
      const newChartType = handleSelectChartType(functionType as string);
      setPalette({
        labels: legendConfig.labelNames,
        palette: legendConfig.palette,
      });
      setSelectedChartType(
        newChartType.customTimeseriesChart || "timeSeriesNumericalQuery"
      );
      setSelectedChartUnit(newChartType.unit || "");

      if (isSelectedAreaOnMapUpdated) {
        setIsSelectedAreaOnMapUpdated(false);
      }
    }
  }, [isSelectedAreaOnMapUpdated, plotReadyDataForSelectedAreaOnMap.data]);

  useEffect(() => {
    if (removeLayerSignal === selectedRasterLayer.layerName) {
      setPlotReadyDataForSelectedAreaOnMap(null, "");
      setData(null);
    }
  }, [removeLayerSignal]);

  useEffect(() => {
    if (isMapChartPanelOpen) {
      setQueryIsReady(true);
    } else {
      setQueryIsReady(false);
      setData(null);
    }
  }, [isMapChartPanelOpen]);

  if (!data?.outputsFromMap?.timeSeriesQueryValues) {
    return;
  }

  return (
    <>
      {(() => {
        if (
          (data?.outputsFromMap?.timeSeriesQueryValues?.length > 0 ||
            Object.values(data?.outputsFromMap?.timeSeriesQueryValues).some(
              (value) => Array.isArray(value) && value.length > 0
            )) &&
          queryIsReady
        ) {
          return (
            <div className="flex h-full w-full overflow-hidden">
              <Chart
                data={data.outputsFromMap.timeSeriesQueryValues}
                chartType={selectedChartType}
                chartTitle="Time Series Query"
                palette={palette}
                chartUnit={selectedChartUnit}
              />
            </div>
          );
        } else if (data?.outputsFromMap?.length === 0 && queryIsReady) {
          return (
            <div className="flex items-center justify-center w-full h-full">
              <p>No Data Available for this location</p>
            </div>
          );
        }
      })()}
    </>
  );
});

ChartTimeseriesQueryDisplay.displayName = "ChartTimeseriesQueryDisplay";
