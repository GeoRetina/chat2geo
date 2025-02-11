"use client";
import React, { useRef, useEffect, useMemo } from "react";
import * as echarts from "echarts";
import { chartColors } from "@/custom-configs/charts-config";
import EChartsReact from "echarts-for-react";
import { useTheme } from "next-themes";

const getHslVariable = (variableName: any) => {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
  return `hsl(${value})`;
};

interface ChartProps {
  chartType: string;
  data: any;
  chartTitle: string;
  palette?: any;
  chartUnit?: string;
  extraInfo?: string;
}

export default function Chart({
  chartType,
  data,
  chartTitle,
  palette,
  chartUnit,
  extraInfo,
}: ChartProps) {
  const { theme } = useTheme();
  const labelColor =
    theme === "dark"
      ? getHslVariable("--foreground") || "#e5e7eb" // Fallback to light gray
      : getHslVariable("--secondary-foreground") || "#1f2937"; // Fallback to dark gray

  echarts.registerTheme("custom_dark", {
    labelColor: labelColor,
  });

  switch (chartType) {
    case "scoresBarChart":
      return <ScoresBarChart data={data} chartTitle={chartTitle} />;
    case "timeSeries":
      return (
        <TimeSeriesChart
          data={data}
          chartTitle={chartTitle}
          theme={theme}
          labelColor={labelColor}
          chartUnit={chartUnit}
        />
      );

    case "stackedBarChartForLandcoverChangeMaps":
      return (
        <StackedBarChartForLandcoverChangeMap
          data={data}
          chartTitle={chartTitle}
          theme={theme}
          palette={palette}
        />
      );

    case "timeSeriesNumericalQuery":
      return (
        <TimeSeriesNumericalQueryChart
          data={data}
          chartTitle={chartTitle}
          chartUnit={chartUnit}
          theme={theme}
          labelColor={labelColor}
        />
      );
    case "dualTimeSeriesChart":
      return (
        <DualTimeSeriesNumericalQueryChart
          data={data}
          chartTitle={chartTitle}
          theme={theme}
          labelColor={labelColor}
        />
      );
    case "barChartStats":
      return (
        <BarChartStatistics
          data={data}
          chartTitle={chartTitle}
          theme={theme}
          labelColor={labelColor}
        />
      );
    case "stackedBarChartStats":
      return (
        <StackedBarChartStatistics
          data={data}
          chartTitle={chartTitle}
          theme={theme}
          labelColor={labelColor}
        />
      );
    case "stackedPercentageBarChartStats":
      return (
        <StackedPercentageBarChartStatistics
          data={data}
          chartTitle={chartTitle}
          theme={theme}
          labelColor={labelColor}
        />
      );
    case "combinedStackedBarChartStats":
      return (
        <CombinedStackedBarChartStatistics
          data={data}
          chartTitle={chartTitle}
          theme={theme}
          labelColor={labelColor}
        />
      );
    case "boxplotTimeseries":
      return (
        <BoxPlotTimeseriesChart
          data={data}
          chartTitle={chartTitle}
          extraInfo={extraInfo}
          theme={theme}
          labelColor={labelColor}
        />
      );
    case "barChartPercentage":
      return (
        <BarChartPercentage
          data={data}
          chartTitle={chartTitle}
          palette={palette}
          theme={theme}
          labelColor={labelColor}
        />
      );
    case "barChartNumerical":
      return (
        <BarChartNumerical
          data={data}
          chartTitle={chartTitle}
          theme={theme}
          labelColor={labelColor}
          chartUnit={chartUnit}
        />
      );
    case "dualBarChartNumerical":
      return (
        <DualBarChartNumerical
          data={data}
          chartTitle={chartTitle}
          theme={theme}
          labelColor={labelColor}
        />
      );
    case "pieChartStats":
      return (
        <PieChartStats
          data={data}
          chartTitle={chartTitle}
          palette={palette}
          theme={theme}
          labelColor={labelColor}
        />
      );
    case "histogram":
      return <HistogramChart data={data} />;
    default:
      return <div></div>;
  }
}

const extractChartName = (chartTitle: string) => {
  const regex = /-\d+/;
  const match = chartTitle.match(regex);
  if (match) {
    return chartTitle.substring(0, chartTitle.indexOf(match[0]));
  } else {
    return chartTitle;
  }
};

interface TimeseriesNumericalQueryChartProps {
  data: { year: number; value: number }[];
  chartTitle: string;
}

type ScoreData = { name: string; score: number | string };

type ScoresBarChartProps = {
  data: ScoreData[];
  chartTitle: string;
};

export const ScoresBarChart: React.FC<ScoresBarChartProps> = ({
  data,
  chartTitle,
}) => {
  if (!data) {
    data = [
      { name: "Surface Materials", score: "N/A" },
      { name: "Vegetation", score: "N/A" },
      { name: "Traffic", score: "N/A" },
      { name: "Impervious", score: "N/A" },
      { name: "Shading", score: "N/A" },
    ];
  }

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRef.current) {
      const chartInstance = echarts.init(chartRef.current);

      const option = {
        title: {
          text: chartTitle,
          left: "center",
          textStyle: {
            color: "#B2BEB5",
            fontSize: 20,
            fontWeight: "bold",
          },
        },
        tooltip: {
          trigger: "item",
          formatter: function (params: any) {
            return `${params.name}: ${params.value}`;
          },
        },
        xAxis: {
          show: false, // Hide the x-axis
        },
        yAxis: {
          type: "category",
          data: data.map((d) => d.name), // Use only the names for the labels
          axisLine: {
            lineStyle: {
              color: "#B2BEB5",
              width: 2,
            },
          },
          axisLabel: {
            color: "#B2BEB5",
            // fontWeight: "bold",
            overflow: "break", // Prevent overflow
            fontSize: 14, // Adjust font size to fit labels
          },
          splitLine: { show: false }, // Remove grid lines
        },
        series: [
          {
            type: "bar",
            data: data.map((d) => (d.score === "N/A" ? 0 : d.score)), // Use scores for the values, 0 for "N/A"
            label: {
              show: true,
              position: "right", // Move labels to the right
              formatter: function (params: any) {
                return data[params.dataIndex].score;
              },
              color: "white",
              fontSize: 14,
              // fontWeight: "bold",
            },
            itemStyle: {
              borderColor: "#16a34a",
              borderWidth: 2,
              color: "rgba(0, 0, 0, 0)", // Fully transparent fill
            },
          },
        ],
        backgroundColor: "transparent",
        grid: {
          left: 130, // Increase left margin to make space for y-axis labels
          bottom: 20, // Adjust bottom margin
          top: 60, // Adjust top margin to make space for title
          right: 20,
        },
      };

      chartInstance.setOption(option);

      return () => {
        chartInstance.dispose();
      };
    }
  }, [data, chartTitle]);

  return <div ref={chartRef} style={{ width: "100%", height: "100%" }}></div>;
};

////////////////////////////////////////

interface TimeseriesChartProps {
  data: { year: number; value: number }[];
  chartTitle: string;
  chartUnit: string | undefined;
  theme: string | undefined;
  labelColor: string;
}

export const TimeSeriesChart = ({
  data,
  chartTitle,
  chartUnit,
  theme,
}: TimeseriesChartProps) => {
  // Prepare the chart option using useMemo for performance optimization
  const option = useMemo(() => {
    const validData = data.filter((point) => point.value !== 0);
    const zeroValueData = data.filter((point) => point.value === 0);
    const gridLineColor = "rgba(255, 255, 255, 0.2)";

    // Replace this with your actual color palette
    const colorPalette = ["#5470C6", "#EE6666"]; // Example colors

    if (validData.length === 1) {
      const singlePoint = validData[0];

      // Prepare series data
      const seriesData = [
        { value: [0, singlePoint.value], symbol: "none" },
        { value: [1, singlePoint.value], symbol: "circle" },
      ];

      const series = {
        type: "line",
        smooth: false,
        lineStyle: {
          color: "#16a34a",
        },
        itemStyle: {
          // color: "#72d60f",
        },
        symbolSize: 10,
        data: seriesData,
      };

      return {
        title: {
          text: chartTitle,
          left: "center",
          top: 10,
          textStyle: {
            // color: "#E5E7EB",
            fontSize: 16,
            fontWeight: "bold",
          },
        },
        tooltip: {
          trigger: "axis",
          formatter: function (params: any) {
            const index = params[0].dataIndex;
            if (index === 1) {
              const value = params[0].value[1];
              return `Year: ${singlePoint.year}<br/>Value: ${value} ${
                chartUnit || ""
              }`;
            }
            return "";
          },
        },
        xAxis: {
          type: "value",
          min: 0,
          max: 1,
          interval: 1,
          axisLine: {
            lineStyle: {
              // color: "#B2BEB5",
              width: 2,
            },
          },
          axisLabel: {
            formatter: function (value: any) {
              if (value === 1) return singlePoint.year.toString();
              return "";
            },
            // color: "#B2BEB5",
            fontSize: 12,
          },
          splitLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
        },
        yAxis: {
          type: "value",
          min: singlePoint.value - 1,
          max: singlePoint.value + 1,
          name: chartUnit || "",
          nameTextStyle: { fontSize: 14, align: "center" },
          axisLine: {
            lineStyle: {
              // color: "#B2BEB5",
              width: 2,
            },
          },
          axisLabel: {
            // color: "#B2BEB5",
            fontSize: 12,
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: gridLineColor,
            },
          },
        },
        series: [series],
        backgroundColor: "transparent",
        grid: {
          left: "15%",
          right: "10%",
          top: 60,
          bottom: 70,
        },
      };
    } else {
      // Original code for multiple data points
      const years = data.map((d) => d.year);
      let minYear = Math.min(...years);
      let maxYear = Math.max(...years);

      const values = validData.map((d) => d.value);
      let minValue = Math.min(...values) - 1;
      let maxValue = Math.max(...values) + 1;

      const seriesData = validData.map((point) => [point.year, point.value]);

      const series = {
        type: "line",
        smooth: false,
        lineStyle: {
          color: colorPalette[0],
        },
        itemStyle: {
          // color: "#72d60f",
        },
        symbolSize: 10,
        data: seriesData,
        markPoint: {
          data: zeroValueData.map((point) => ({
            coord: [point.year, point.value],
            name: "Low-Quality LST",
            value: "Low-Quality LST",
            itemStyle: {
              color: "red",
            },
            label: {
              color: "red",
              fontSize: 12,
              formatter: "Low-Quality LST",
              position: "top",
            },
          })),
        },
      };

      return {
        title: {
          text: chartTitle,
          left: "center",
          top: 10,
          textStyle: {
            // color: "#E5E7EB",
            fontSize: 16,
            fontWeight: "bold",
          },
        },
        tooltip: {
          trigger: "axis",
          formatter: function (params: any) {
            const year = params[0].value[0];
            const value = params[0].value[1];
            return `Year: ${year}<br/>Value: ${value} ${chartUnit || ""}`;
          },
        },
        xAxis: {
          type: "value",
          name: "",
          min: minYear,
          max: maxYear,
          nameLocation: "middle",
          nameGap: 25,
          nameTextStyle: { color: "#B2BEB5", fontSize: 14 },
          axisLine: {
            lineStyle: {
              // color: "#B2BEB5",
              width: 2,
            },
          },
          axisLabel: {
            // color: "#B2BEB5",
            fontSize: 12,
            formatter: (value: any) => value.toString(),
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: gridLineColor,
            },
          },
          axisTick: {
            alignWithLabel: true,
          },
          interval: 1,
          offset: 10,
        },
        yAxis: {
          type: "value",
          name: chartUnit || "",
          min: minValue,
          max: maxValue,
          nameTextStyle: { fontSize: 14 },
          axisLine: {
            lineStyle: {
              // color: "#B2BEB5",
              width: 2,
            },
          },
          axisLabel: {
            // color: "#B2BEB5",
            fontSize: 12,
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: gridLineColor,
            },
          },
        },
        series: [series],
        backgroundColor: "transparent",
        grid: {
          top: 60,
          bottom: 40,
          left: "13%",
          right: "8%",
        },
      };
    }
  }, [data, chartTitle, chartUnit]);

  return (
    <div className="py-2" style={{ width: "100%", height: "100%" }}>
      <EChartsReact
        theme={theme === "dark" ? "dark" : "light"}
        option={option}
        style={{ width: "100%", height: "100%" }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
};

////////////////////////////////////////
// Time-series chart for query results
export const TimeSeriesNumericalQueryChart: React.FC<{
  data: any[];
  chartTitle: string;
  chartUnit: string | undefined;
  theme: string | undefined;
  labelColor: string;
}> = ({ data, chartTitle, chartUnit, theme, labelColor }) => {
  // Find the first non-undefined field (e.g., CO, NO2)
  const dataField = Object.keys(
    data.find((d) =>
      Object.keys(d).some((key) => key !== "date" && d[key] !== undefined)
    ) || {}
  ).find((key) => key !== "date" && data.some((d) => d[key] !== undefined));

  // Filter out undefined values for the selected data field
  const validData = data.filter(
    (d) => (dataField && d[dataField] !== undefined) || d.values !== undefined
  );

  // Prepare series data (with sequential index on x-axis)
  const seriesData = validData.map((d, index) => [
    index,
    (dataField && d[dataField]) || d.values,
  ]);

  const valuesArray = validData.map(
    (d) => (dataField && d[dataField]) || d.values
  );

  const minValue = Math.min(...valuesArray);
  const maxValue = Math.max(...valuesArray);

  // Add some margin (e.g., 5% of the data range)
  const margin = (maxValue - minValue) * 0.05;
  const adjustedMinValue = minValue - margin;
  const adjustedMaxValue = maxValue + margin;

  // Set up eCharts options
  const option = {
    title: {
      text: chartTitle,
      top: 10,
      left: "center",
      show: true,
      textStyle: {
        // color: "#E5E7EB",
        fontSize: 16,
        fontWeight: "bold",
      },
    },
    tooltip: {
      trigger: "axis",
      formatter: function (params: any) {
        const index = params[0].value[0];
        const value = params[0].value[1].toExponential(4);
        const date = validData[index].date;
        return `Date: ${date}<br/>Value: ${value}${
          chartUnit ? ` ${chartUnit}` : ""
        }`;
      },
    },
    xAxis: {
      type: "category",
      name: " ",
      data: validData.map((_, index) => " "), // Use index for unique x-axis
      axisLine: {
        lineStyle: {
          color: "#B2BEB5",
          width: 2,
        },
      },
      axisLabel: {
        // color: "#B2BEB5",
        fontSize: 12,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "rgba(255, 255, 255, 0.2)",
        },
      },
      axisTick: {
        alignWithLabel: true,
        show: false,
      },
    },
    yAxis: {
      type: "value",
      name: chartUnit ? `${dataField} (${chartUnit})` : dataField,
      min: adjustedMinValue.toExponential(2),
      max: adjustedMaxValue.toExponential(2),
      axisLine: {
        lineStyle: {
          // color: "#B2BEB5",
          width: 2,
        },
      },
      axisLabel: {
        // color: "#B2BEB5",
        fontSize: 12,
        formatter: (value: number) => value.toExponential(2),
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "rgba(255, 255, 255, 0.2)",
        },
      },
      splitNumber: 3,
    },
    series: [
      {
        type: "line",
        smooth: false,
        lineStyle: {
          // color: "#16a34a",
        },
        itemStyle: {
          // color: "#72d60f",
        },
        symbolSize: 10,
        data: seriesData,
      },
    ],
    // backgroundColor: "transparent",
    grid: {
      left: "5%", // Adjust the left spacing
      right: "5%", // Adjust the right spacing to center the chart
      top: 60,
      bottom: 0,
      containLabel: true, // Ensures labels don't overflow the chart's boundary
    },
  };

  return (
    <div className="pt-2" style={{ width: "100%", height: "100%" }}>
      <EChartsReact
        theme={theme === "dark" ? "dark" : "light"}
        option={option}
        style={{ height: "100%", width: "100%" }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
};

////////////////////////////////////////
// Dual Time-series chart for query results when two data fields are available (e.g., NO2 and CO)

export const DualTimeSeriesNumericalQueryChart: React.FC<{
  data: { [gas: string]: any[] };
  chartTitle: string;
  theme: string | undefined;
  labelColor: string;
}> = ({ data, chartTitle, theme, labelColor }) => {
  // Extract the gas names dynamically from the data object keys
  const gases = Object.keys(data);

  const colorPalette = chartColors["dualBarChartNumerical"]; // Ensure this is defined

  // Find all unique dates across all gases
  const allDates = [
    ...new Set(gases.flatMap((gas) => data[gas].map((d) => d.date))),
  ];

  // Prepare valid dates - only dates for which at least one gas has valid data
  const validDates = allDates.filter((date) =>
    gases.some((gas) => {
      const gasData = data[gas].find((d) => d.date === date);
      return gasData && !isNaN(parseFloat(gasData[gas]));
    })
  );

  // Prepare series data filtered by valid dates
  const seriesData = gases.map((gas, index) => {
    const gasData = validDates.map((date) => {
      const entry = data[gas].find((d) => d.date === date);
      return entry ? parseFloat(entry[gas]) : NaN;
    });

    const validGasData = gasData.filter((value) => !isNaN(value));
    const minValue = Math.min(...validGasData);
    const maxValue = Math.max(...validGasData);
    const margin = (maxValue - minValue) * 0.05;
    return {
      gas,
      data: gasData,
      minValue: minValue - margin,
      maxValue: maxValue + margin,
      yAxisIndex: index, // Index will map each gas to a separate y-axis
    };
  });

  // Define the y-axes for the chart
  const yAxes = seriesData.map((series, index) => ({
    type: "value",
    name: `${series.gas}`,
    min: isFinite(series.minValue) ? series.minValue : null,
    max: isFinite(series.maxValue) ? series.maxValue : null,
    axisLine: {
      lineStyle: {
        color: index === 0 ? colorPalette[0] : colorPalette[1], // Different color for each y-axis
        width: 2,
      },
    },
    axisLabel: {
      color: "#B2BEB5",
      fontSize: 12,
      formatter: (value: number) => value.toExponential(2),
    },
    splitLine: {
      show: index === 0, // Show split lines only for the first y-axis
      lineStyle: {
        color: "rgba(255, 255, 255, 0.2)",
      },
    },
    position: index === 0 ? "left" : "right", // First y-axis on the left, others on the right
  }));

  // Define the series for the chart
  const series = seriesData.map((series, index) => ({
    name: series.gas,
    type: "line",
    smooth: false,
    lineStyle: {
      color: index === 0 ? colorPalette[0] : colorPalette[1], // Different color for each line
    },
    itemStyle: {
      color: index === 0 ? colorPalette[0] : colorPalette[1],
    },
    yAxisIndex: index,
    symbolSize: 10,
    data: series.data,
  }));

  const option = {
    title: {
      text: chartTitle,
      top: 10,
      left: "center",
      textStyle: {
        color: "#E5E7EB",
        fontSize: 16,
        fontWeight: "bold",
      },
    },
    tooltip: {
      trigger: "axis",
      formatter: function (params: any) {
        let tooltipText = `Date: ${params[0]?.axisValue || "N/A"}<br/>`;
        params.forEach((param: any) => {
          const value =
            param.value && !isNaN(param.value)
              ? parseFloat(param.value).toExponential(4)
              : "N/A";
          tooltipText += `${param.seriesName}: ${value}<br/>`;
        });
        return tooltipText;
      },
    },
    legend: {
      data: gases, // Show gas names dynamically in the legend
      top: 40,
      textStyle: {
        color: "#E5E7EB",
      },
    },
    xAxis: {
      type: "category",
      name: "",
      data: validDates, // Use only valid dates
      axisLine: {
        show: false,
        lineStyle: {
          color: "#B2BEB5",
          width: 2,
        },
      },
      axisLabel: {
        color: "#B2BEB5",
        fontSize: 12,
      },
      axisTick: {
        show: false, // Disable any ticks on the x-axis
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "rgba(255, 255, 255, 0.2)",
        },
      },
    },
    yAxis: yAxes,
    series: series,
    backgroundColor: "transparent",
    grid: {
      left: "5%", // Adjust the left spacing
      right: "5%", // Adjust the right spacing to center the chart
      top: 70,
      bottom: 10,
      containLabel: true,
    },
  };

  return (
    <div className="pt-2" style={{ width: "100%", height: "100%" }}>
      <EChartsReact
        theme={theme === "dark" ? "dark" : "light"}
        option={option}
        style={{ width: "100%", height: "100%" }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
};

////////////////////////////////////////
// Box plot component for time series statistics
export type TimeSeriesStats = {
  [year: string]: {
    Min: number;
    Median: number; // You can replace this with Q2 if you have it
    Mean: number;
    Max: number;
    Q1: number;
    Q3: number;
  };
};

export type BoxPlotTimeseriesChartProps = {
  data: TimeSeriesStats;
  chartTitle: string;
  extraInfo?: string;
  theme: string | undefined;
  labelColor: string;
};

export const BoxPlotTimeseriesChart = React.memo<BoxPlotTimeseriesChartProps>(
  ({ data, chartTitle, extraInfo, theme, labelColor }) => {
    const years = Object.keys(data);
    const generateColors = (numColors: number) => {
      const colors = [];
      for (let i = 0; i < numColors; i++) {
        const hue = (i * 360) / numColors;
        // Adjusted saturation and lightness for better visibility on light background
        colors.push(`hsl(${hue}, 80%, 45%)`);
      }
      return colors;
    };
    const colors = generateColors(years.length);

    const candlestickData = years.map((year, index) => {
      const stats = data[year];
      return {
        name: year,
        value: [
          Number(stats.Q1.toFixed(2)),
          Number(stats.Q3.toFixed(2)),
          Number(stats.Min.toFixed(2)),
          Number(stats.Max.toFixed(2)),
          Number(stats.Median.toFixed(2)),
          Number(stats.Mean.toFixed(2)),
        ],
        itemStyle: {
          color: colors[index],
          // Changed border color to be more visible on light background
          // borderColor: "#666666",
        },
      };
    });

    const option = {
      backgroundColor: "transparent",
      title: {
        text: chartTitle,
        top: 10,
        left: "center",
        // Updated text color for light background
        // textStyle: { color: "#1a1a1a", fontSize: 16, fontWeight: "bold" },
        textStyle: { fontSize: 16, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          label: {
            // Updated for better contrast
            // backgroundColor: "#1a1a1a",
            // color: "#ffffff",
          },
        },
        formatter: (params: any) => {
          const param = params[0];
          const data = param.data.value;
          return `
          Year: ${param.name}<br/>
          Min: ${data[3]}<br/>
          Median: ${data[1]}<br/>
          Mean: ${data[5]}<br/>
          Max: ${data[4]}<br/>
        `;
        },
      },
      xAxis: {
        type: "category",
        data: years,
        boundaryGap: true,
        // axisLine: { lineStyle: { color: "#333333" } },
        // axisLabel: { color: "#333333" },
      },
      grid: {
        top: 60,
        left: "5%",
        right: "10%",
        bottom: "10%",
        containLabel: true,
      },
      yAxis: {
        type: "value",
        scale: true,
        // Updated split line color for light background
        // splitLine: { lineStyle: { color: "rgba(0, 0, 0, 0.1)" } },
        // axisLabel: { color: "#333333" },
        // axisLabel: { color: labelColor },
      },
      series: [
        {
          name: "Statistics",
          type: "candlestick",
          data: candlestickData,
          markLine: {
            data: [
              {
                yAxis: Math.min(...candlestickData.map((d) => d.value[2])),
                name: "Min",
                symbol: "none",
                label: {
                  show: true,
                  formatter: (params: any) => `${params.value}`,
                  fontStyle: "italic",
                  fontWeight: "bold",
                  fontSize: 14,
                  // Updated colors for better visibility
                  // color: "#0066cc",
                },
                lineStyle: { type: "dashed", color: "#0066cc" },
              },
              {
                yAxis: Math.max(...candlestickData.map((d) => d.value[3])),
                name: "Max",
                symbol: "none",
                label: {
                  show: true,
                  formatter: (params: any) => `${params.value}`,
                  fontStyle: "italic",
                  fontWeight: "bold",
                  fontSize: 14,
                  // Updated to a darker red for better contrast
                  // color: "#cc0000",
                },
                lineStyle: { type: "dashed", color: "#cc0000" },
              },
            ],
          },
        },
      ],
    };

    return (
      <div
        className="py-2"
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <EChartsReact
          theme={theme === "dark" ? "dark" : "light"}
          option={option}
          style={{ width: "100%", height: "100%" }}
          notMerge={true}
          lazyUpdate={true}
        />
      </div>
    );
  }
);

////////////////////////////////////////
//Bar chart for percentage values
export type BarChartPercentageProps = {
  data: {
    monoTemporalQueryValues: { name: string; percentage: number }[];
  };
  chartTitle: string;
  palette?: any;
  theme: string | undefined;
  labelColor: string;
};

export const BarChartPercentage: React.FC<BarChartPercentageProps> = ({
  data,
  chartTitle,
  palette,
  theme,
}) => {
  const extractedChartTitle = extractChartName(chartTitle);
  const { labels: paletteLabels, palette: paletteColors } = palette;

  // Map the data labels to their corresponding colors in the palette
  const mappedColors = data.monoTemporalQueryValues.map((d) => {
    const labelIndex = paletteLabels.indexOf(d.name);
    return labelIndex !== -1 ? paletteColors[labelIndex] : "#cccccc"; // Default to gray if no match is found
  });

  const option = {
    title: {
      text: extractedChartTitle,
      left: "center",
      top: 10,
      textStyle: {
        // color: "#E5E7EB",
        fontSize: 16,
      },
    },
    tooltip: {
      trigger: "item",
      confine: true,
      formatter: function (params: any) {
        return `${params.name}: ${
          parseInt(params.value) === 0 ? "< 1" : params.value
        }%`;
      },
    },
    grid: {
      left: "10%",
      right: "10%",
      top: 60,
      bottom: "5%",
    },
    yAxis: {
      type: "category",
      data: data.monoTemporalQueryValues.map((d) => d.name),
      axisLine: {
        lineStyle: {
          // color: "#B2BEB5",
          width: 2,
        },
      },
      axisLabel: {
        show: false, // Hide the y-axis labels since they will be on the bars
      },
      position: "right", // Position the y-axis on the right side
      inverse: true, // Reverse the order of categories (bottom to top)
    },
    xAxis: {
      type: "value",
      axisLine: {
        show: false,
      },
      axisLabel: {
        show: false,
      },
      splitLine: { show: false },
      inverse: true, // Reverse the x-axis to make the bars start from right to left
    },
    series: [
      {
        type: "bar",
        data: data.monoTemporalQueryValues.map((d, index) => ({
          value: d.percentage,
          name: d.name,
          label: {
            show: true,
            // color: "#333333 ",
            color: theme === "dark" ? "#e5e7eb" : "#1f2937",
            position: "insideRight",
            formatter: (params: any) => {
              const labelText =
                params.name.length > 10
                  ? params.name.slice(0, 10) + "..."
                  : params.name; // Truncate long names
              const valueText =
                parseInt(params.value) === 0 ? "< 1" : params.value;
              return `${labelText}       ${valueText}%`;
            },

            fontSize: 14,
            // color: "white",
            align: "right",
            verticalAlign: "middle",
            padding: [0, 10, 0, 0],
            z: 1,
          },
          itemStyle: {
            color: mappedColors[index],
          },
        })),
        barWidth: "80%",
        barGap: "0%",
      },
    ],
    backgroundColor: "transparent",
  };

  return (
    <EChartsReact
      theme={theme === "dark" ? "dark" : "light"}
      option={option}
      style={{ height: "100%", width: "100%" }}
      notMerge={true}
      lazyUpdate={true}
    />
  );
};

////////////////////////////////////////
// Bar chart for numerical values
export type BarChartNumericalProps = {
  data: any;
  chartTitle: string;
  chartUnit: string | undefined;
  theme: string | undefined;
  labelColor: string;
};

export const BarChartNumerical: React.FC<BarChartNumericalProps> = ({
  data,
  chartTitle,
  chartUnit,
  theme,
}) => {
  const colorPalette = chartColors["barChartNumerical"];

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center">
        <strong className="text-center justify-center items-center">
          No data available for this location
        </strong>
      </div>
    );
  }

  const extractedChartTitle = chartTitle;
  const option = {
    title: {
      text: `${extractedChartTitle}`,
      left: "center",
      top: 10,
      textStyle: {
        fontSize: 16,
      },
    },
    tooltip: {
      show: false,
      trigger: "item",
      formatter: function (params: any) {
        return `${params.name}: ${params.value} ${chartUnit || ""}`;
      },
    },
    xAxis: {
      type: "category",
      data: data.monoTemporalQueryValues.map((_: any, index: any) => ``),
      axisLine: {
        lineStyle: {
          width: 2,
        },
      },
      axisLabel: {
        overflow: "break",
        rotate: 0,
        fontSize: 14,
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      show: false,
    },
    series: [
      {
        type: "bar",
        data: data.monoTemporalQueryValues.map((d: any) => ({
          value: d,
          name: `${chartTitle}`,
          label: {
            show: true,
            position: "inside",
            color: theme === "dark" ? "#e5e7eb" : "#1f2937",
            formatter: `{c} ${chartUnit || ""}`,
            fontSize: 14,
          },
        })),
        itemStyle: {
          borderColor: colorPalette[0],
          borderWidth: 2,
          color: "rgba(0, 0, 0, 0)",
        },
      },
    ],
    backgroundColor: "transparent",
    grid: {
      left: "10%",
      right: "20%",
      bottom: "5%",
      top: 60,
      containLabel: true,
    },
  };

  return (
    <div className="pt-2" style={{ width: "100%", height: "100%" }}>
      <EChartsReact
        theme={theme === "dark" ? "dark" : "light"}
        option={option}
        style={{ height: "100%", width: "100%" }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
};

////////////////////////////////////////
// Dual-bar chart for numerical values

export type DualBarChartNumericalProps = {
  data: any;
  chartTitle: string;
  theme: string | undefined;
  labelColor: string;
};

export const DualBarChartNumerical: React.FC<DualBarChartNumericalProps> = ({
  data,
  chartTitle,
  theme,
}) => {
  const parsedData = data.values.monoTemporalQueryValues;

  if (!parsedData || Object.keys(parsedData).length === 0) {
    return (
      <div className="flex items-center justify-center">
        <strong className="text-center justify-center items-center">
          No data available for this location
        </strong>
      </div>
    );
  }

  const colorPalette = chartColors["dualBarChartNumerical"];

  const keys = Object.keys(parsedData);

  const isPercentage = keys.some(
    (key) => parsedData[key].percentageChange !== undefined
  );

  let option = {};

  if (isPercentage) {
    const yAxisOptions = [
      {
        type: "value",
        name: "",
        position: "left",
        axisLine: {
          lineStyle: {
            color: "#B2BEB5",
            width: 2,
          },
        },
        axisLabel: {
          color: "#B2BEB5",
          fontSize: 10,
          formatter: (value: number) => `${value.toFixed(0)}%`,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: "#444",
          },
        },
      },
    ];

    const seriesData = keys.map((key, index) => {
      const gasData = parsedData[key];
      const value = parseFloat(gasData.percentageChange);
      return {
        value: value,
        name: key,
        label: {
          show: true,
          position: value !== null && value < 0 ? "top" : "inside",
          formatter: `${value.toFixed(0)}%`,
          // color: "white",
          color: theme === "dark" ? "#e5e7eb" : "#1f2937",
          fontSize: 12,
        },
        itemStyle: {
          color: colorPalette[index % colorPalette.length],
        },
      };
    });

    option = {
      title: {
        text: chartTitle,
        left: "center",
        top: 10,
        textStyle: {
          color: "#e5e7eb",
          fontSize: 16,
        },
      },
      tooltip: {
        show: true,
        trigger: "item",
        confine: true,
        formatter: function (params: any) {
          const gasData = parsedData[params.name];
          return `${params.name}<br/>
          Date 1: ${gasData.gasValue1}<br/>
          Date 2: ${gasData.gasValue2}<br/>
          Difference: ${gasData.differenceValue}<br/>
          Percentage Change: ${gasData.percentageChange}`;
        },
      },
      xAxis: {
        type: "category",
        data: keys,
        axisLine: {
          lineStyle: {
            color: "#B2BEB5",
            width: 2,
          },
        },
        axisLabel: {
          color: "#B2BEB5",
          fontSize: 14,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: "#444",
          },
        },
      },
      yAxis: yAxisOptions,
      series: [
        {
          name: "Percentage Change",
          type: "bar",
          data: seriesData,
          barWidth: "80%",
        },
      ],
      backgroundColor: "transparent",
      grid: {
        left: "5%",
        right: "5%",
        bottom: "5%",
        top: 60,
        containLabel: true,
      },
    };
  } else {
    const yAxisOptions = [
      {
        type: "value",
        name: "",
        position: "left",
        axisLine: {
          lineStyle: {
            color: "#B2BEB5",
            width: 2,
          },
        },
        axisLabel: {
          color: "#B2BEB5",
          fontSize: 10,
          formatter: (value: number) =>
            value !== null && !isNaN(value) ? value.toExponential(2) : "",
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: "#444",
          },
        },
      },
      {
        type: "value",
        name: "",
        position: "right",
        axisLine: {
          lineStyle: {
            color: "#B2BEB5",
            width: 2,
          },
        },
        axisLabel: {
          color: "#B2BEB5",
          fontSize: 10,
          formatter: (value: number) =>
            value !== null && !isNaN(value) ? value.toExponential(2) : "",
        },
        splitLine: {
          show: false,
        },
      },
    ];

    const values = keys.map((key) => {
      const gasData = parsedData[key];
      const value = parseFloat(gasData.gasValue1);
      return value;
    });

    const validValues = values.filter(
      (v): v is number => v !== null && !isNaN(v)
    );
    const max_value = Math.max(...validValues);
    const maxThreshold = max_value / 2;

    const seriesData1: any[] = new Array(keys.length).fill(null);
    const seriesData2: any[] = new Array(keys.length).fill(null);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const gasData = parsedData[key];
      const value = parseFloat(gasData.gasValue1);
      const unit = gasData.unit;

      const dataPoint = {
        value: value,
        name: key,
        label: {
          show: true,
          position: value !== null && value < 0 ? "top" : "inside",
          formatter: `${value.toExponential(2)} \n\n(${unit})`,
          // color: "white",
          color: theme === "dark" ? "#e5e7eb" : "#1f2937",
          fontSize: 12,
        },
        itemStyle: {
          color: colorPalette[i % colorPalette.length],
        },
      };

      if (value !== null && value >= maxThreshold) {
        seriesData1[i] = dataPoint;
      } else {
        seriesData2[i] = dataPoint;
      }
    }

    option = {
      title: {
        text: chartTitle,
        left: "center",
        top: 10,
        textStyle: {
          color: "#e5e7eb",
          fontSize: 16,
        },
      },
      tooltip: {
        show: true,
        trigger: "item",
        formatter: function (params: any) {
          const gasData = parsedData[params.name];
          return `${params.name}<br/>
          ${gasData.gasValue1}`;
        },
      },
      xAxis: {
        type: "category",
        data: keys,
        axisLine: {
          lineStyle: {
            color: "#B2BEB5",
            width: 2,
          },
        },
        axisLabel: {
          color: "#B2BEB5",
          fontSize: 14,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: "#444",
          },
        },
      },
      yAxis: yAxisOptions,
      series: [
        {
          name: "High Values",
          type: "bar",
          yAxisIndex: 0,
          data: seriesData1,
          barWidth: "80%",
          barGap: "-100%",
        },
        {
          name: "Low Values",
          type: "bar",
          yAxisIndex: 1,
          data: seriesData2,
          barWidth: "80%",
          barGap: "-100%",
        },
      ],
      backgroundColor: "transparent",
      grid: {
        left: "5%",
        right: "5%",
        bottom: "5%",
        top: 60,
        containLabel: true,
      },
    };
  }

  return (
    <div className="pt-2" style={{ width: "100%", height: "100%" }}>
      <EChartsReact
        option={option}
        style={{ width: "100%", height: "100%" }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
};

type BarChartStatsProps = {
  data: {
    Mean: number | string;
    Median: number | string;
    Min: number | string;
    Max: number | string;
  };
  chartTitle: string;
  theme: string | undefined;
  labelColor: string;
};

export const BarChartStatistics: React.FC<BarChartStatsProps> = ({
  data,
  chartTitle,
  theme,
}) => {
  const extractedChartTitle = extractChartName(chartTitle);

  // Define a color palette
  const colorPalette = [
    "#16a34a", // Green for Min
    "#1f77b4", // Blue for Median
    "#ff7f0e", // Orange for Mean
    "#d62728", // Red for Max
  ];

  const option = {
    title: {
      show: true, // Show the title in the chart
      text: extractedChartTitle, // Use the chartTitle passed as a prop
      left: "center", // Center the title horizontally
      top: 10, // Adjust the vertical position of the title
      textStyle: {
        // color: "#e5e7eb",
        fontSize: 16,
      },
    },
    grid: {
      left: "5%",
      right: "5%",
      top: 70,
      bottom: "3%",
      containLabel: true,
    },
    tooltip: {
      trigger: "item",
      formatter: function (params: any) {
        return `${params.name}: ${params.value}`;
      },
    },
    xAxis: {
      type: "category",
      data: ["Min", "Median", "Mean", "Max"],
      axisLine: {
        lineStyle: {
          // color: "#B2BEB5",
          width: 2,
        },
      },
      axisLabel: {
        show: true,
      },
    },
    yAxis: {
      type: "value",
      axisLine: {
        show: false,
      },
      axisLabel: {
        show: false,
      },
      splitLine: { show: false },
    },
    series: [
      {
        type: "bar",
        data: [
          {
            value: data.Min,
            name: "Min",
            itemStyle: { color: colorPalette[0] },
          },
          {
            value: data.Median,
            name: "Median",
            itemStyle: { color: colorPalette[1] },
          },
          {
            value: data.Mean,
            name: "Mean",
            itemStyle: { color: colorPalette[2] },
          },
          {
            value: data.Max,
            name: "Max",
            itemStyle: { color: colorPalette[3] },
          },
        ],
        label: {
          show: true,
          position: "top",
          formatter: (params: any) => `${params.value}`,
          fontSize: 12,
          // color: "white",
          color: theme === "dark" ? "#e5e7eb" : "#1f2937",
          align: "center",
          verticalAlign: "middle",
          offset: [0, -10],
          z: 1,
        },
        barWidth: "50%",
        barGap: "0%",
      },
    ],
    backgroundColor: "transparent",
  };

  return (
    <div className="pt-2" style={{ width: "100%", height: "100%" }}>
      <EChartsReact
        theme={theme === "dark" ? "dark" : "light"}
        option={option}
        style={{ width: "100%", height: "100%" }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
};

////////////////////////////////////////
// Stacked bar chart component for the query stats
////////////////////////////////////////

type StackedBarChartStatisticsProps = {
  data: {
    gas: {
      Mean: { actual: string; normalized: string };
      Median: { actual: string; normalized: string };
      Min: { actual: string; normalized: string };
      Max: { actual: string; normalized: string };
    };
  };
  chartTitle: string;
  theme: string | undefined;
  labelColor: string;
};

export const StackedBarChartStatistics: React.FC<
  StackedBarChartStatisticsProps
> = ({ data, chartTitle, theme, labelColor }) => {
  const extractedChartTitle = chartTitle;
  const colorPalette = chartColors["stackedBarChartStats"]; // Colors for Min, Median, Mean, Max

  // Dynamically extract the keys from the data (CO, NO2, CH4, etc.)
  const keys = Object.keys(data) as Array<keyof typeof data>;
  const series: any = [];
  const legendData: any = [];
  const yAxis: any = [];

  // Loop through each key to generate the series and y-axes dynamically
  keys.forEach((key, index) => {
    const actuals = {
      Min: parseFloat(data[key as keyof typeof data].Min.actual),
      Median: parseFloat(data[key].Median.actual),
      Mean: parseFloat(data[key].Mean.actual),
      Max: parseFloat(data[key].Max.actual),
    };

    // Generate unique y-axis for each gas
    yAxis.push({
      type: "value",
      name: key.toUpperCase(),
      position: index % 2 === 0 ? "left" : "right", // Alternate between left and right y-axis
      axisLine: {
        lineStyle: {
          color: colorPalette[index % colorPalette.length], // Color to match the gas
        },
      },
      splitLine: { show: false },
      axisLabel: {
        formatter: function (value: number) {
          return value.toExponential(2); // Format in exponential for readability
        },
      },
    });

    // Push the series for each key
    series.push({
      name: key.toUpperCase(), // Capitalize the key name for display in the legend
      type: "bar",
      yAxisIndex: index, // Assign to the corresponding y-axis
      stack: key, // Stack bars for the same gas type
      itemStyle: { color: colorPalette[index % colorPalette.length] }, // Rotate colors
      data: [
        {
          value: actuals.Min, // No scaling required, as each y-axis has its own scale
          actual: actuals.Min,
        },
        {
          value: actuals.Median,
          actual: actuals.Median,
        },
        {
          value: actuals.Mean,
          actual: actuals.Mean,
        },
        {
          value: actuals.Max,
          actual: actuals.Max,
        },
      ],
    });

    // Add the key to the legend
    legendData.push(key.toUpperCase());
  });

  const option = {
    title: {
      show: true,
      text: extractedChartTitle,
      left: "center",
      top: 10,
      textStyle: {
        // color: "#e5e7eb",
        fontSize: 16,
      },
    },
    grid: {
      left: "5%",
      right: "5%",
      top: 70,
      bottom: "10%", // Increased bottom space for labels
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      containLabel: true,
      confine: true,
      axisPointer: {
        type: "shadow",
      },
      formatter: function (params: any) {
        let tooltipText = `${params[0].name}<br/>`;
        params.forEach((param: any) => {
          const { seriesName } = param;
          const actual = param.data.actual.toExponential(2);
          tooltipText += `${seriesName}: ${actual}<br/>`;
        });
        return tooltipText;
      },
    },
    legend: {
      data: legendData, // Use dynamically generated legend data
      top: 40,
      textStyle: {
        // color: "#e5e7eb",
      },
    },
    xAxis: {
      type: "category",
      data: ["Min", "Median", "Mean", "Max"],
      axisLine: {
        lineStyle: {
          color: "#B2BEB5",
          width: 2,
        },
      },
      axisLabel: {
        // color: "#e5e7eb",
        interval: 0, // Ensure all labels are shown
        rotate: 0,
        fontSize: 12,
      },
    },
    yAxis: yAxis, // Use dynamically generated y-axes
    series: series, // Use dynamically generated series
    backgroundColor: "transparent",
  };

  return (
    <div className="pt-2" style={{ width: "100%", height: "100%" }}>
      <EChartsReact
        theme={theme === "dark" ? "dark" : "light"}
        option={option}
        style={{ width: "100%", height: "100%" }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
};

////////////////////////////////////////
// Stacked percenrage bar chart component for the query stats
////////////////////////////////////////

type StackedBarChartPercentageProps = {
  data: {
    gas: {
      Mean: { actual: string; percentage: string };
      Median: { actual: string; percentage: string };
      Min: { actual: string; percentage: string };
      Max: { actual: string; percentage: string };
    };
  };
  chartTitle: string;
  theme: string | undefined;
  labelColor: string;
};

export const StackedPercentageBarChartStatistics: React.FC<
  StackedBarChartPercentageProps
> = ({ data, chartTitle, theme, labelColor }) => {
  const extractedChartTitle = chartTitle;
  const colorPalette = chartColors["stackedBarChartStats"]; // Colors for Median, Mean

  // Dynamically extract the keys from the data (CO, Aerosols, etc.)
  const keys = Object.keys(data) as Array<keyof typeof data>;
  const series: any = [];
  const legendData: any = [];

  // Loop through each key to generate the series dynamically
  keys.forEach((key, index) => {
    const percentages = {
      Median: data[key].Median.percentage
        ? parseInt(data[key].Median.percentage)
        : 0,
      Mean: data[key].Mean.percentage ? parseInt(data[key].Mean.percentage) : 0,
    };

    // Push the series for each key
    series.push({
      name: key.toUpperCase(), // Capitalize the key name for display in the legend
      type: "bar",
      stack: key, // Stack bars for the same gas type
      itemStyle: { color: colorPalette[index % colorPalette.length] }, // Rotate colors
      data: [
        { value: percentages.Median, actual: percentages.Median },
        { value: percentages.Mean, actual: percentages.Mean },
      ],
    });

    // Add the key to the legend
    legendData.push(key.toUpperCase());
  });

  const option = {
    title: {
      show: true,
      text: extractedChartTitle,
      left: "center",
      top: 10,
      textStyle: {
        // color: "#e5e7eb",
        fontSize: 16,
      },
    },
    grid: {
      left: "5%",
      right: "5%",
      top: 70,
      bottom: "15%", // Increased bottom space for labels
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      containLabel: true,
      confine: true,
      axisPointer: {
        type: "shadow",
      },
      formatter: function (params: any) {
        let tooltipText = `${params[0].name}<br/>`;
        params.forEach((param: any) => {
          const { seriesName, value } = param;
          const actual = param.data.actual.toFixed(0) + "%";
          tooltipText += `${seriesName}: ${actual}<br/>`;
        });
        return tooltipText;
      },
    },
    legend: {
      data: legendData, // Use dynamically generated legend data
      top: 40,
      textStyle: {
        // color: "#e5e7eb",
      },
    },
    xAxis: {
      type: "category",
      data: ["Median", "Mean"], // Only show Median and Mean
      axisLine: {
        lineStyle: {
          // color: "#B2BEB5",
          width: 2,
        },
      },
      axisTick: {
        alignWithLabel: true, // Ensures the labels align under the bars
      },
      axisLabel: {
        // color: "#e5e7eb",
        interval: 0, // Ensure all labels are shown, even if overlapping
        rotate: 0, // No rotation of labels
        fontSize: 12, // Adjust font size if labels are too large
      },
    },
    yAxis: {
      type: "value",
      axisLine: {
        lineStyle: {
          // color: "#e5e7eb",
        },
      },
      splitLine: { show: false },
      axisLabel: {
        formatter: function (value: number) {
          return value.toFixed(0) + "%"; // Format as percentage for readability
        },
        // color: "#e5e7eb",
      },
      name: "", // Removes the y-axis label name
    },
    series: series, // Use dynamically generated series
    backgroundColor: "transparent",
  };

  return (
    <div className="pt-2" style={{ width: "100%", height: "100%" }}>
      <EChartsReact
        theme={theme === "dark" ? "dark" : "light"}
        option={option}
        style={{ width: "100%", height: "100%" }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
};

////////////////////////////////////////
// Combined stacked bar chart component for the query stats

type GasData = {
  Mean: { actual: string; percentage: string | null };
  Median: { actual: string; percentage: string | null };
  Min: { actual: string; percentage: string | null };
  Max: { actual: string; percentage: string | null };
  unit: AirPollutantsUnits;
};

type CombinedStackedBarChartStatisticsProps = {
  data: {
    [gas: string]: GasData;
  };
  chartTitle: string;
  theme: string | undefined;
  labelColor: string;
};

export const CombinedStackedBarChartStatistics: React.FC<
  CombinedStackedBarChartStatisticsProps
> = ({ data, chartTitle, theme, labelColor }) => {
  const colorPalette = chartColors["stackedBarChartStats"]; // Define your color palette

  // Extract gases and ensure they are strings
  const gases = Object.keys(data) as string[];

  // Determine if percentages are present in the data
  const isPercentageMode = gases.some((gas) =>
    ["Mean", "Median"].some(
      (stat) =>
        data[gas][stat as AggregationMethodTypeNumerical].percentage !== null &&
        data[gas][stat as AggregationMethodTypeNumerical].percentage !==
          undefined
    )
  );

  const series: any[] = [];
  const legendData: string[] = [];
  const yAxisOptions: any[] = [];
  let xAxisData: AggregationMethodTypeNumerical[] = [];

  if (isPercentageMode) {
    // Percentage Mode
    xAxisData = ["Median", "Mean"];

    gases.forEach((gas, gasIndex) => {
      const percentages = xAxisData.map((stat) => {
        const percentageValue = data[gas][stat].percentage;
        return percentageValue ? parseFloat(percentageValue) : 0;
      });

      series.push({
        name: gas,
        type: "bar",
        stack: gas,
        itemStyle: { color: colorPalette[gasIndex % colorPalette.length] },
        data: percentages.map((value) => ({ value, actual: value })),
      });

      legendData.push(gas);
    });

    // Configure yAxis for percentage mode
    yAxisOptions.push({
      type: "value",
      axisLine: {
        lineStyle: {
          // color: "#e5e7eb",
        },
      },
      splitLine: { show: false },
      axisLabel: {
        formatter: function (value: number) {
          return value.toFixed(0) + "%";
        },
        // color: "#e5e7eb",
      },
      name: "",
    });
  } else {
    // Non-Percentage Mode
    xAxisData = ["Min", "Median", "Mean", "Max"];

    gases.forEach((gas, gasIndex) => {
      const actuals = xAxisData.map((stat) => {
        const actualValue = data[gas][stat].actual;
        return actualValue ? parseFloat(actualValue) : null;
      });

      // Generate unique y-axis for each gas
      yAxisOptions.push({
        type: "value",
        name: data[gas].unit,
        position: gasIndex % 2 === 0 ? "left" : "right",
        offset: gasIndex > 1 ? 50 * Math.floor(gasIndex / 2) : 0,
        axisLine: {
          lineStyle: {
            color: colorPalette[gasIndex % colorPalette.length],
          },
        },
        splitLine: { show: false },
        axisLabel: {
          formatter: function (value: number) {
            return value.toExponential(2);
          },
          color: colorPalette[gasIndex % colorPalette.length],
        },
      });

      series.push({
        name: gas,
        type: "bar",
        yAxisIndex: gasIndex,
        stack: gas,
        itemStyle: { color: colorPalette[gasIndex % colorPalette.length] },
        data: actuals.map((value) => ({
          value,
          actual: value,
          unit: data[gas].unit,
        })),
      });

      legendData.push(gas);
    });
  }

  const option = {
    title: {
      show: true,
      text: chartTitle,
      left: "center",
      top: 10,
      textStyle: {
        // color: "#e5e7eb",
        fontSize: 16,
      },
    },
    grid: {
      left: "5%",
      right: "5%",
      top: 70,
      bottom: "15%",
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      containLabel: true,
      confine: true,
      axisPointer: {
        type: "shadow",
      },
      formatter: function (params: any) {
        let tooltipText = `${params[0].name}<br/>`;
        params.forEach((param: any) => {
          const { seriesName, data } = param;
          if (isPercentageMode) {
            const actual = data.actual.toFixed(0) + "%";
            tooltipText += `<strong>${seriesName}:</strong> ${actual}<br/>`;
          } else {
            const actual = data.actual ? data.actual.toExponential(2) : "N/A";
            tooltipText += `<strong>${seriesName}:</strong> ${actual} (${data.unit})<br/>`;
          }
        });
        return tooltipText;
      },
    },
    legend: {
      data: legendData,
      top: 40,
      textStyle: {
        // color: "#e5e7eb",
      },
    },
    xAxis: {
      type: "category",
      data: xAxisData,
      axisLine: {
        lineStyle: {
          // color: "#B2BEB5",
          width: 2,
        },
      },
      axisTick: {
        alignWithLabel: true,
      },
      axisLabel: {
        // color: "#e5e7eb",
        interval: 0,
        rotate: 0,
        fontSize: 12,
      },
    },
    yAxis: yAxisOptions,
    series: series,
    backgroundColor: "transparent",
  };

  return (
    <div className="pt-2" style={{ width: "100%", height: "100%" }}>
      <EChartsReact
        theme={theme === "dark" ? "dark" : "light"}
        option={option}
        style={{ width: "100%", height: "100%" }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
};

////////////////////////////////////////
// Stacked bar chart for land-cover change map
////////////////////////////////////////
interface LandcoverDistributions {
  year1Distribution: Record<string, string>;
  year2Distribution: Record<string, string>;
}

interface StackedBarChartForLandcoverChangeMapProps {
  /**
   * Contains the two distributions. Example:
   * {
   *   year1Distribution: { Water: "8.3", Trees: "31.2", ... },
   *   year2Distribution: { Water: "7.5", Trees: "32.7", ... }
   * }
   */
  data: LandcoverDistributions;
  chartTitle: string;
  palette: {
    labels: string[]; // e.g. ["Water", "Trees", "Grass", ...]
    palette: string[]; // e.g. ["#419BDF", "#397D49", ...]
  };
  theme: string | undefined;
}

/**
 * Renders a stacked bar chart:
 * - X-axis: 2 categories => Year 1, Year 2
 * - One bar series per landcover class => stacks to show 100% total
 */
export const StackedBarChartForLandcoverChangeMap =
  React.memo<StackedBarChartForLandcoverChangeMapProps>(
    ({ data, chartTitle, palette, theme }) => {
      const { year1Distribution, year2Distribution } = data;

      const allLabels = palette.labels;
      const colors = palette.palette;

      // Build ECharts series
      const series = useMemo(() => {
        return allLabels.map((label, idx) => {
          const y1Val = parseFloat(year1Distribution[label] ?? "0");
          const y2Val = parseFloat(year2Distribution[label] ?? "0");

          return {
            name: label,
            type: "bar",
            stack: "total",
            itemStyle: {
              color: colors[idx] || "#e2e8f0",
            },
            data: [y1Val, y2Val],
          };
        });
      }, [allLabels, colors, year1Distribution, year2Distribution]);

      const option = useMemo(() => {
        return {
          backgroundColor: theme === "dark" ? "#00000000" : "#ffffff",
          title: {
            text: chartTitle,
            top: 10,
            left: "center",
            textStyle: {
              fontSize: 16,
              fontWeight: "bold",
              color: theme === "dark" ? "#e5e7eb" : "#1f2937",
            },
          },
          tooltip: {
            trigger: "axis",
            confine: true,
            formatter: (params: any) => {
              // `params` is an array of stacked segments (one per class) for that X category
              let content = `${params[0].axisValue}<br/>`;
              params.forEach((item: any) => {
                // If the value is 0, skip it
                if (item.value > 0) {
                  content += `${item.marker} ${item.seriesName}: ${item.value}%<br/>`;
                }
              });
              return content;
            },
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderColor: "#e2e8f0",
            textStyle: {
              color: "#1f2937",
            },
          },
          grid: {
            top: 80,
            left: "15%",
            right: "5%",
            bottom: "15%",
          },
          xAxis: {
            type: "category",
            data: ["Year 1", "Year 2"],
            axisLine: {
              lineStyle: {
                color: theme === "dark" ? "#e5e7eb" : "#1f2937",
              },
            },
            axisLabel: {
              color: theme === "dark" ? "#e5e7eb" : "#1f2937",
            },
          },
          yAxis: {
            type: "value",
            max: 100,
            axisLine: { show: false },
            axisLabel: {
              color: theme === "dark" ? "#e5e7eb" : "#1f2937",
              formatter: "{value}%",
            },
            splitLine: {
              lineStyle: {
                color: theme === "dark" ? "#374151" : "#e2e8f0",
              },
            },
          },
          series,
        };
      }, [chartTitle, theme, series]);

      return (
        <div style={{ width: "100%", height: "400px" }}>
          <EChartsReact
            option={option}
            notMerge={true}
            lazyUpdate={true}
            style={{ width: "100%", height: "100%" }}
            theme={theme === "dark" ? "dark" : "light"}
          />
        </div>
      );
    }
  );

////////////////////////////////////////
// Pie chart component for the query stats
////////////////////////////////////////

interface PieChartStatsProps {
  data: Record<string, string>; // Update the type of data
  chartTitle: string;
  palette?: any;
  theme: string | undefined;
  labelColor: string;
}
export const PieChartStats = React.memo<PieChartStatsProps>(
  ({ data, chartTitle, palette, theme, labelColor }) => {
    const processedData: {
      name: string;
      value: number;
      itemStyle?: { color: string };
    }[] = useMemo(() => {
      const { labels, palette: paletteColors } = palette;

      const dataArray = Object.entries(data).map(([name, value]) => ({
        name,
        value: parseFloat(value),
      }));

      return dataArray.map(({ name, value }) => {
        const labelIndex = labels.indexOf(name);

        return {
          name,
          value,
          itemStyle: {
            color: labelIndex !== -1 ? paletteColors[labelIndex] : "#e2e8f0",
          },
        };
      });
    }, [data, palette]);

    const option = {
      backgroundColor: theme === "dark" ? "#00000000" : "#ffffff",
      title: {
        text: chartTitle,
        top: 10,
        left: "center",
        show: true,
        textStyle: {
          fontSize: 16,
          fontWeight: "bold",
        },
      },
      tooltip: {
        trigger: "item",
        confine: true,
        formatter: function (params: any) {
          return `${params.name}: ${params.percent}%`;
        },
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderColor: "#e2e8f0",
        textStyle: {
          color: "#1f2937",
        },
      },
      series: [
        {
          name: "Classes",
          type: "pie",
          radius: "65%",
          center: ["50%", "60%"],
          data: processedData,
          // emphasis: {
          //   itemStyle: {
          //     shadowBlur: 10,
          //     shadowOffsetX: 0,
          //     shadowColor: "rgba(0, 0, 0, 0.1)", // Lighter shadow for light theme
          //   },
          // },
          label: {
            // color: "#1f2937", // Dark gray for light theme
            color: theme === "dark" ? "#e5e7eb" : "#1f2937",
            formatter: "{b}: {d}%",
          },
        },
      ],
    };

    return (
      <EChartsReact
        option={option}
        theme={theme === "dark" ? "dark" : "light"}
        style={{ width: "100%", height: "100%" }}
        notMerge={true}
        lazyUpdate={true}
      />
    );
  }
);

////////////////////////////////////////
// Histogram chart component for the query stats

type ValueType = {
  output: number;
  UID: number;
  vectorLayerData: any;
};

type InputArgsType = {
  type: string;
  name: string;
  vectorLayerName: string;
  values: ValueType[];
};

type HistogramChartProps = {
  data: InputArgsType;
};

export const HistogramChart: React.FC<HistogramChartProps> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chart = echarts.init(chartRef.current as HTMLDivElement);

    const option = {
      title: {
        text: `${data.vectorLayerName}: ${data.name}`,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
      },
      xAxis: {
        type: "category",
        data: data.values.map((item) => item.UID),
        name: "UID",
      },
      yAxis: {
        type: "value",
        name: "Output",
      },
      series: [
        {
          type: "bar",
          data: data.values.map((item) => item.output),
          barWidth: "50%",
        },
      ],
    };

    chart.setOption(option);

    return () => {
      chart.dispose();
    };
  }, [data]);

  return <div ref={chartRef} style={{ width: "100%", height: "100%" }} />;
};
