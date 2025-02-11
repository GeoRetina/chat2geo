import React, { useState, useEffect, useMemo, memo, useRef } from "react";
import { Rnd } from "react-rnd";
import {
  useReactTable,
  createColumnHelper,
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import { X } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import AttributeTableControls from "./attribute-table-controls";
import useGeojsonStore from "../../stores/use-geojson-store";
import useZoomRequestStore from "../../stores/use-map-zoom-request-store";
import useDrawnFeatureOnMapStore from "../../stores/use-drawn-feature-on-map-store";
import useLoadingStore from "@/stores/use-loading-store";
import useTableStore from "../../stores/use-table-store";
import { formatQueryForTable } from "../../utils/other-utils";

const columnHelper = createColumnHelper<any>();
const MIN_PANEL_HEIGHT = 150;

const AttributeTable: React.FC = () => {
  const { setLoading } = useLoadingStore();
  const { getGeojsonDataByName } = useGeojsonStore();
  const [isDeleteFeaturesEnabled, setIsDeleteFeaturesEnabled] = useState(false);
  const [isDataAvailable, setIsDataAvailable] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  // NEW: Track expanded cell content in a dialog
  const [expandedCellValue, setExpandedCellValue] = useState<string | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const setZoomRequestFromTable = useZoomRequestStore(
    (state) => state.setZoomRequestFromTable
  );

  const isTableOpen = useTableStore((state) => state.isTableOpen);
  const toggleTable = useTableStore((state) => state.toggleTable);
  const setSelectedFeatureInTable = useTableStore(
    (state) => state.setSelectedFeatureInTable
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 600, height: 200 });

  const { drawnFeaturesOnMap, selectDrawnFeature, clearSelectedDrawnFeature } =
    useDrawnFeatureOnMapStore();

  // Transform drawnFeaturesOnMap to Feature[]
  const features: Feature[] = useMemo(() => {
    return drawnFeaturesOnMap
      .map((feature) => {
        if (feature.geometry === "Point") {
          const { coordinates, query, ...otherProps } = feature;
          return {
            lat: feature.lat,
            lon: feature.lon,
            query: formatQueryForTable(query),
            ...otherProps,
          } as Feature;
        } else if (feature.geometry === "Polygon") {
          const {
            coordinates = [],
            query,
            ...otherProps
          } = feature.coordinates
            ? { ...feature, coordinates: feature.coordinates[0] }
            : feature;

          const lats = coordinates.map((coord) => coord[1]);
          const lons = coordinates.map((coord) => coord[0]);

          return {
            lat: lats,
            lon: lons,
            query: formatQueryForTable(query),
            ...otherProps,
          } as Feature;
        }
        return null;
      })
      .filter((item): item is Feature => item !== null);
  }, [drawnFeaturesOnMap]);

  // Zoom logic
  const handleZoomInQuery = () => {
    if (selectedRow === null) {
      setZoomRequestFromTable(null);
      return;
    }
    const selectedFeature = features[selectedRow];
    setZoomRequestFromTable(selectedFeature);
    setSelectedFeatureInTable(selectedFeature);
  };

  useEffect(() => {
    setIsDeleteFeaturesEnabled(features.length > 0);
    setIsDataAvailable(features.length > 0);
  }, [features]);

  // Prepare data for the table
  const data = useMemo(() => {
    if (features.length === 0) return [];
    return features.map((feature: any, index: number) => {
      const { featureLayerName, ...rest } = feature;
      return {
        UID: feature.UID || index + 1,
        ...rest,
      };
    });
  }, [features]);

  // Build columns from data keys
  const columns = useMemo<ColumnDef<any, any>[]>(() => {
    if (features.length === 0) return [];
    const keys = Object.keys(features[0]).filter(
      (key) => key !== "featureLayerName"
    );
    const sortedKeys = keys.includes("UID")
      ? ["UID", ...keys.filter((key) => key !== "UID")]
      : ["UID", ...keys];

    return sortedKeys.map((key) =>
      columnHelper.accessor(key, {
        header: () => (key === "rasterLayerName" ? "reference analysis" : key),
      })
    );
  }, [features]);

  const [sorting, setSorting] = useState<any>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // onClick for each cell
  const handleCellClick = (fullValue: string) => {
    setExpandedCellValue(fullValue);
    setIsDialogOpen(true);
  };

  // onClick for a row
  const handleRowClick = (rowIndex: number) => {
    if (selectedRow === rowIndex) {
      setSelectedRow(null);
      setZoomRequestFromTable(null);
      clearSelectedDrawnFeature();
    } else {
      clearSelectedDrawnFeature();
      selectDrawnFeature(data[rowIndex].UID);
      setSelectedRow(rowIndex);
    }
  };

  const columnCount = columns.length;
  const gridTemplateColumns = `repeat(${columnCount}, 1fr)`;

  // Virtual scrolling
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
  });
  const allRows = table.getRowModel().rows;

  // A memoized row
  const Row = memo(({ index }: { index: number }) => {
    const row = allRows[index];
    const isSelected = selectedRow === index;

    return (
      <div
        className={`border-b border-stone-300 dark:border-stone-600 ${
          isSelected ? "bg-green-300" : "bg-secondary"
        }`}
        style={{
          display: "grid",
          gridTemplateColumns,
        }}
        onClick={() => handleRowClick(index)}
      >
        {row.getVisibleCells().map((cell) => {
          const rawValue = cell.getValue<any>();
          const cellValue = Array.isArray(rawValue)
            ? rawValue.join(", ")
            : rawValue;

          // Truncate in the table
          const truncated =
            cellValue && cellValue.length > 20
              ? cellValue.slice(0, 20) + "..."
              : cellValue;

          return (
            <div
              key={cell.id}
              className={`p-2 text-sm cursor-pointer custom-scrollbar scrollbar-right ${
                isSelected ? "dark:text-background" : ""
              }`}
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (cell.column.id === "UID") {
                  handleRowClick(index);
                } else {
                  // Show the full value in a dialog
                  handleCellClick(cellValue);
                }
              }}
            >
              {truncated}
            </div>
          );
        })}
      </div>
    );
  });
  Row.displayName = "Row";

  // Center + bottom positioning logic
  useEffect(() => {
    if (isTableOpen && containerRef.current) {
      const parentBounds = containerRef.current.getBoundingClientRect();
      const parentWidth = parentBounds.width;
      const parentHeight = parentBounds.height;

      const rndWidth = size.width;
      const rndHeight = size.height;

      const centerX = parentWidth / 2 - rndWidth / 2;
      const bottomY = parentHeight * 0.82 - rndHeight;

      setPosition({
        x: centerX,
        y: bottomY,
      });
    }
  }, [isTableOpen]);

  return (
    <div ref={containerRef} className="relative w-full h-screen">
      {isTableOpen && (
        <Rnd
          position={{ x: position.x, y: position.y }}
          size={{ width: size.width, height: size.height }}
          onDragStop={(e, data) => {
            setPosition({ x: data.x, y: data.y });
          }}
          onResizeStop={(e, dir, ref, delta, pos) => {
            setSize({
              width: ref.offsetWidth,
              height: ref.offsetHeight,
            });
            setPosition({ x: pos.x, y: pos.y });
          }}
          bounds="parent"
          minWidth={400}
          minHeight={MIN_PANEL_HEIGHT}
          dragHandleClassName="drag-handle"
          enableResizing={{
            top: true,
            right: true,
            bottom: true,
            left: true,
            topRight: true,
            bottomRight: true,
            bottomLeft: true,
            topLeft: true,
          }}
          className="z-[1000]"
        >
          <section className="h-full w-full flex flex-col bg-muted rounded-lg overflow-hidden">
            {/* DRAG HANDLE */}
            <div className="flex justify-end items-center bg-background border-b border-stone-300 dark:border-stone-600 rounded-t-lg drag-handle cursor-move">
              <Button
                onClick={() => toggleTable()}
                variant="ghost"
                size={"icon"}
                className="inline-flex items-center"
              >
                <X />
              </Button>
            </div>

            {/* Controls */}
            <div className="w-full">
              <AttributeTableControls
                isDataAvailable={isDataAvailable}
                setSelectedRow={setSelectedRow}
                handleZoomInQuery={handleZoomInQuery}
                onClose={() => toggleTable()}
              />
            </div>

            {/* The table */}
            <div className="flex flex-col flex-grow overflow-hidden">
              {/* Table header */}
              <div className="table border-collapse w-full">
                <div className="flex-shrink-0 w-full">
                  <div
                    className="border-b border-stone-300 dark:border-stone-600"
                    style={{
                      display: "grid",
                      gridTemplateColumns,
                    }}
                  >
                    {table.getHeaderGroups().map((headerGroup) => (
                      <div className="contents" key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                          const sorted = header.column.getIsSorted();
                          return (
                            <div
                              key={header.id}
                              onClick={header.column.getToggleSortingHandler()}
                              className="flex justify-center items-center py-1 text-sm font-medium text-center bg-blue-500 cursor-pointer select-none"
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              <span>
                                {sorted === "desc"
                                  ? " 🔽"
                                  : sorted === "asc"
                                  ? " 🔼"
                                  : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scrollable parent for rows */}
              <div
                ref={parentRef}
                className="w-full flex-grow min-h-0 overflow-auto text-center"
              >
                <div
                  style={{
                    height: rowVirtualizer.getTotalSize(),
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const index = virtualRow.index;
                    return (
                      <div
                        key={virtualRow.key}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: 40,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <Row index={index} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </Rnd>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-x outline-none">
          <DialogHeader>
            <DialogTitle>Full Cell Content</DialogTitle>
            <DialogDescription>
              Below is the entire cell text.
            </DialogDescription>
          </DialogHeader>

          <div className="whitespace-pre-wrap overflow-auto max-h-[60vh] mt-2">
            {expandedCellValue}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttributeTable;
