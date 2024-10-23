import {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext,
} from "react";
import * as Plot from "@observablehq/plot";
import {
  defaultOptions,
  getColorScheme,
  getObservableOptions,
} from "./plotUtils";
import { saveAsPNG } from "./utils/saveChart";
import { Button } from "@ui-components";
import { Download } from "lucide-react";
import { ChartStateContext } from "./ChartStateContext";
import { unix } from "dayjs";
import dayjs from "dayjs";
import { convertWideToLong } from "../utils/utils";

export default function ObservablePlot() {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const chartState = useContext(ChartStateContext);

  const observableOptions = useMemo(() => {
    const {
      selectedChart,
      selectedColumns,
      chartStyle,
      chartSpecificOptions,
      availableColumns,
      data,
    } = chartState;

    // if selected.x or selected.y is null, return null here
    // or if selectedColumns.y.length is 0, also return null
    if (
      // if x is null
      !selectedColumns.x ||
      // if y is null
      !selectedColumns.y ||
      // if y is array but has length 0
      (Array.isArray(selectedColumns.y) && !selectedColumns?.y?.length)
    ) {
      return null;
    }

    const xColumn = availableColumns.find(
      (col) => col.key === selectedColumns.x
    );

    const dateToUnix = xColumn?.isDate ? xColumn.dateToUnix : null;

    let processedData = data;

    // Process dates if necessary
    if (xColumn?.isDate && dateToUnix) {
      processedData = data.map((item) => ({
        ...item,
        [selectedColumns.x]:
          dateToUnix(item[selectedColumns.x]) || item[selectedColumns.x],
      }));
    }

    if (selectedChart === "bar" || selectedChart === "line") {
      try {
        processedData = convertWideToLong(
          processedData,
          selectedColumns.x,
          selectedColumns.y
        );
      } catch (e) {
        console.error("Error converting wide to long format", e);
      }
    }

    if (selectedChart !== "bar" && selectedChart !== "line") {
      return getObservableOptions(
        dimensions,
        {
          ...defaultOptions,
          type: selectedChart || "Bar",
          x: selectedColumns.x || null,
          y: selectedColumns.y || null,
          facet: selectedColumns.facet,
          filter: chartSpecificOptions[selectedChart]?.filter,
          xIsDate: xColumn?.isDate,
          dateToUnix,
          ...chartStyle,
          ...chartSpecificOptions[selectedChart],
        },
        processedData
      );
    } else if (selectedChart === "bar") {
      return getObservableOptions(
        dimensions,
        {
          ...defaultOptions,
          type: selectedChart,
          // we do this only if an x column and some y columns are selected
          x: selectedColumns.x && selectedColumns?.y?.length && "label",
          // check to ensure we don't render a blank chart if no axis is selected
          y: selectedColumns.x && selectedColumns?.y?.length ? "value" : null,
          facet: selectedColumns.x || null,
          filter: chartSpecificOptions[selectedChart]?.filter,
          xIsDate: xColumn?.isDate,
          dateToUnix,
          ...chartStyle,
          ...chartSpecificOptions[selectedChart],
        },
        processedData
      );
    } else if (selectedChart == "line") {
      return getObservableOptions(
        dimensions,
        {
          ...defaultOptions,
          type: selectedChart,
          x: selectedColumns.x || null,
          // check to ensure we don't render a blank chart if no axis is selected
          y: selectedColumns.x && selectedColumns.y.length ? "value" : null,
          stroke: "label",
          // disable facetting for line charts for now
          // facet: selectedColumns.facet || null,
          filter: chartSpecificOptions[selectedChart]?.filter,
          xIsDate: xColumn?.isDate,
          dateToUnix,
          ...chartStyle,
          ...chartSpecificOptions[selectedChart],
        },
        processedData
      );
    }
  }, [dimensions, chartState]);

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions((prev) =>
        width !== prev.width || height !== prev.height
          ? { width, height }
          : prev
      );
    }
  }, []);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    updateDimensions();
    return () => resizeObserver.disconnect();
  }, [updateDimensions]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (observableOptions) {
      containerRef.current.innerHTML = "";
      // always reset the padding or it messes with boundclient calculation below
      containerRef.current.style.padding = "0 0 0 0";
      const xColumn = chartState.availableColumns.find(
        (col) => col.key === chartState.selectedColumns.x
      );

      if (chartState.selectedChart === "bar") {
        containerRef.current.appendChild(
          Plot.plot({
            ...observableOptions,
            fx: {
              grid: false,
              tickRotate: -90,
              tickFormat: (d) => {
                if (xColumn.isDate && dayjs(d).isValid()) {
                  // if date, format it
                  // convert from unix to date
                  const date = unix(d).format("YYYY-MM-DD");
                  return date;
                } else {
                  return d;
                }
              },
              axis: "bottom",
            },
            x: {
              axis: null,
              label: "",
            },
          })
        );
      } else if (chartState.selectedChart === "line") {
        // we will create a custom scale
        // and use (if specified) options.lineOptions
        const { colorScheme } = getColorScheme(
          chartState.chartStyle.selectedScheme
        );

        const colorDomain = chartState.selectedColumns.y;
        const lineOptions =
          chartState?.chartSpecificOptions?.["line"]?.lineOptions || {};

        let schemeIdx = -1;

        const colorRange = colorDomain.map((col) => {
          // if options.lineOptions[d["label"]] exists, use that
          if (lineOptions[col] && lineOptions[col].stroke) {
            return lineOptions[col].stroke;
          } else {
            // else use the scheme
            // or the interpolator, depending on whether it's a function or array
            return Array.isArray(colorScheme)
              ? colorScheme[++schemeIdx % colorScheme.length]
              : colorScheme(schemeIdx / colorDomain.length);
          }
        });

        // if chart is not a bar chart
        containerRef.current.appendChild(
          Plot.plot({
            ...observableOptions,
            color: {
              ...observableOptions.color,
              // override the scheme. we don't give the option for choosing scheme in line and bar charts.
              scheme: undefined,
              domain: colorDomain,
              range: colorRange,
            },
          })
        );
      } else {
        // if chart is not a bar chart
        containerRef.current.appendChild(
          Plot.plot({
            ...observableOptions,
          })
        );
      }

      /**
       * Now that we have added rotation to the ticks, some of them might overflow the bottom of the svg and get cut off if they are too long.
       * Observable will not handle this on it's own so
       * The below code handles those ticks, and adds the required amount of padding to the container to make the ticks visible
       * We don't directly increase the height of the svg because Observable will react to it and goes into an infinite loop.
       */

      // get the x axis
      const xAxisCtr = containerRef.current.querySelector(
        "[aria-label^='x-axis tick label']"
      );

      // get the y axis
      const yAxisCtr = containerRef.current.querySelector(
        "[aria-label^='y-axis tick label']"
      );

      // the svg <g> element that stores the x axis labels
      // we will later move this down
      const xAxisLabelCtr = containerRef.current.querySelector(
        "[aria-label^='x-axis label']"
      );

      // the svg <g> element that stores the y axis labels
      // we will later move this left
      const yAxisLabelCtr = containerRef.current.querySelector(
        "[aria-label^='y-axis label']"
      );

      let paddingBottom = 0;
      let paddingLeft = 0;

      if (xAxisCtr) {
        try {
          // get the bottom of the container
          const ctrBottom = containerRef.current.getBoundingClientRect().bottom;
          // get the bottom of the x axis (this is the bottom of the ticks + label)
          const xAxisBottom = xAxisCtr.getBoundingClientRect().bottom;
          // if the xAxisBottom is more than ctrBottom, means the ticks are overflowing
          // add the difference in height to the container as padding-bottom

          // the +20 here is because we will also forcefully move the x axis *label* to below the ticks
          let padding = xAxisBottom - ctrBottom + 20;
          padding = padding > 0 ? padding : 0;

          paddingBottom = padding;

          if (xAxisLabelCtr) {
            // parse the transform of this g tag
            const transform = xAxisLabelCtr.getAttribute("transform");
            const [x, y] = transform
              .split("(")[1]
              .slice(0, -1)
              .split(",")
              .map((val) => parseFloat(val));

            // add the padding to the y position. this will move it down in the svg
            const newY = y + padding;
            xAxisLabelCtr.setAttribute("transform", `translate(${x}, ${newY})`);
          }
        } catch (e) {
          // silently fail
        }
      }
      if (yAxisCtr) {
        try {
          // get the left edge of the container
          const ctrLeft = containerRef.current.getBoundingClientRect().left;
          // get the left edge of the y axis (this is the left of the ticks + label)
          const yAxisLeft = yAxisCtr.getBoundingClientRect().left;

          // if the yAxisLeft is more than ctrLeft, means the ticks are overflowing
          // add the difference in x position to the container as padding-left
          let padding = yAxisLeft - ctrLeft - 10;

          // negative padding = y axis is to the left of the ctr
          // keep if negative padding
          paddingLeft = padding < 0 ? Math.abs(padding) : 0;

          if (yAxisLabelCtr) {
            // parse the transform of this g tag
            const transform = yAxisLabelCtr.getAttribute("transform");
            const [x, y] = transform
              .split("(")[1]
              .slice(0, -1)
              .split(",")
              .map((val) => parseFloat(val));

            // add the padding to the x position. this will move it right in the svg
            const newX = x + padding;

            yAxisLabelCtr.setAttribute("transform", `translate(${newX}, ${y})`);
          }
        } catch (e) {
          // silently fail
        }
      }

      containerRef.current.style.padding = `0 0 ${paddingBottom}px ${paddingLeft}px`;
    } else {
      containerRef.current.innerHTML =
        "<div class='flex items-center justify-center h-full w-full'>Please select X and Y axes to display the chart.</div>";
    }
  }, [observableOptions]);

  return (
    <div className="grow bg-white">
      <div className="flex justify-end mb-2">
        <Button
          className="flex flex-row items-center text-sm text-gray-800 border bg-gray-50 hover:bg-gray-200 z-[10]"
          onClick={() => {
            if (containerRef.current) {
              // get the first child inside container because container has overflow scroll
              const chart = containerRef.current.children[0];
              if (chart) {
                saveAsPNG(chart, observableOptions.backgroundColor);
              }
            }
          }}
        >
          <Download size={16} className="mr-2" /> Save as PNG
        </Button>
      </div>
      <div
        className="w-full h-[560px] text-gray-500 bg-white observable-plot overflow-auto"
        ref={containerRef}
      ></div>
    </div>
  );
}
