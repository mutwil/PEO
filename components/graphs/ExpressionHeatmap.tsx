import Plotly from "plotly.js";
import Plot from "react-plotly.js"
import Toggle from "../atomic/inputs/Toggle";
import { useState } from "react";
import * as math from "mathjs";

export interface HeatmapData {
  sampleAnnotationLabels: string[];
  geneLabels: string[];
  tpmMatrix: number[][];
}

interface ExpressionHeatmapProps {
  /**
   * If no HeatmapData supplied, render sample data
   */
  heatmapData?: HeatmapData;
  hideLoader: () => void;
}

/**
 * Did not opt for Matrix from math.js as the only goal was validating shape.
 * Don't need the overhead incurred for optimizing matrix calculations.
 */
const isHeatmapDataShapeValid = (data: HeatmapData): boolean => {
  const height = data.geneLabels.length;
  const width = data.sampleAnnotationLabels.length;
  if (data.tpmMatrix.length === height) {
    console.warn(`Number of geneLabels (${height}) does not match number of rows (${data.tpmMatrix.length})`);
    return false;
  }
  const firstRowWidth = data.tpmMatrix[0].length;
  const allColsSame = data.tpmMatrix.map(x => x.length).every(x => x === firstRowWidth);
  if (!allColsSame) {
    console.warn(`Number of columns not the same for every row`);
    return false;
  }
  if (firstRowWidth !== width) {
    console.warn(`Number of sampleAnnotationLabels (${width}) does not match number of columns for first row`);
    return false;
  }
  return true;
}

const calculatePlotHeight = (nRows: number) => 600 + Math.max(0, nRows - 40) * 10;

/**
 * Dumb component taking in expected data for heatmap
 */
const ExpressionHeatmap = ({ heatmapData, hideLoader }: ExpressionHeatmapProps) => {

  const [ scrollZoomable, setScrollZoomable ] = useState(false);
  const [ normalizeRows, setNormalizeRows ] = useState(false);

  if (!heatmapData || isHeatmapDataShapeValid(heatmapData as unknown as HeatmapData)) {
    return <p>Missing input to the heatmap</p>;
  }

  const height = calculatePlotHeight(heatmapData.geneLabels.length);
  const normTpmMatrix = heatmapData.tpmMatrix.map(row => {
    const rowMax = Math.max(...row);
    return rowMax ? math.divide(row, rowMax) : 0;
  });

  const downloadIcon = {
    width: 500,
    height: 600,
    path: "M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM216 232V334.1l31-31c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-72 72c-9.4 9.4-24.6 9.4-33.9 0l-72-72c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l31 31V232c0-13.3 10.7-24 24-24s24 10.7 24 24z",
  };

  return (
    <div className="my-4">
      <div className="my-3">
        <Toggle
          currState={scrollZoomable}
          handleChange={() => setScrollZoomable(curr => !curr)}
          prompt="Allow zoom on scroll"
        />
      </div>
      <div className="my-3">
        <Toggle
          currState={normalizeRows}
          handleChange={() => setNormalizeRows(curr => !curr)}
          prompt="Normalize to each gene's max TPM"
        />
      </div>
      <Plot
        className="overflow-hidden border border-stone-300 rounded-2xl shadow-lg min-h-[600px] w-full"
        data={[
          {
            type: "heatmap",
            z: (normalizeRows ? normTpmMatrix : heatmapData.tpmMatrix),
            x: heatmapData.sampleAnnotationLabels,
            y: heatmapData.geneLabels,
          },
        ]}
        layout={{
          xaxis: { automargin: true, tickangle: 45 },
          yaxis: { automargin: true },
          height: height,
          autosize: true,
          modebar: { orientation: "v" },
          dragmode: "pan",
        }}
        config={{
          responsive: true,
          displaylogo: false,
          displayModeBar: true,
          modeBarButtonsToAdd: [
            {
              title: "Download as svg",
              name: "Download as svg",
              icon: downloadIcon,
              click: (gd) => {
                Plotly.downloadImage(gd, {
                  format: "svg",
                  width: 800,
                  height: 600,
                  scale: 4,
                  filename: `heatmap`,
                });
              },
            },
            {
              title: "Download as png",
              name: "Download as png",
              icon: downloadIcon,
              click: (gd) => {
                Plotly.downloadImage(gd, {
                  format: "png",
                  width: 800,
                  height: 600,
                  scale: 4,
                  filename: `heatmap`,
                });
              },
            },
          ],
          modeBarButtonsToRemove: [
            "select2d",
            "lasso2d",
            "zoomIn2d",
            "zoomOut2d",
            "autoScale2d",
            "toImage",
          ],
          scrollZoom: scrollZoomable,
        }}
        onInitialized={hideLoader}
      />
    </div>
  );
}

export default ExpressionHeatmap
