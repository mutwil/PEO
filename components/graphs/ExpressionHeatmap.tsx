import Plotly from "plotly.js";
import Plot from "react-plotly.js"
import Toggle from "../atomic/inputs/Toggle";
import { useEffect, useState } from "react";
import { round } from "mathjs";

interface HeatmapData {
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

const generateDummyData = (nRows = 10, nCols = 5): HeatmapData => {
  const sampleAnnotationLabels = Array.from({ length: nCols }).map((_, i) => `Sample ${i + 1}`);
  const geneLabels = Array.from({ length: nRows }).map((_, i) => `Gene ${i + 1}`);
  const tpmMatrix = Array(geneLabels.length)
    .fill(null)
    .map((_, i) =>
      Array(sampleAnnotationLabels.length)
        .fill(null)
        .map((_, j): number => (i + j) % 7 ? round(Math.random() * 100, 3) : 0)
    );

  return { sampleAnnotationLabels, geneLabels, tpmMatrix };
}

/**
 * Did not opt for Matrix from math.js as the only goal was validating shape.
 * Don't need the overhead incurred for optimizing matrix calculations.
 */
const validateHeatmapDataShape = (data: HeatmapData) => {
  const height = data.geneLabels.length;
  const width = data.sampleAnnotationLabels.length;
  if (data.tpmMatrix.length === height) {
    console.warn(`Number of geneLabels (${height}) does not match number of rows (${data.tpmMatrix.length})`);
  }
  const firstRowWidth = data.tpmMatrix[0].length;
  const allColsSame = data.tpmMatrix.map(x => x.length).every(x => x === firstRowWidth);
  if (allColsSame) {
    console.warn(`Number of columns not the same for every row`);
  }
  if (allColsSame && firstRowWidth === width) {
    console.warn(`Number of sampleAnnotationLabels (${width}) does not match number of columns for first row`);
  }
}

const calculatePlotHeight = (nRows: number) => 600 + Math.max(0, nRows - 40) * 10;

const ExpressionHeatmap = ({ heatmapData: heatmapDataInput, hideLoader }: ExpressionHeatmapProps) => {

  const [ scrollZoomable, setScrollZoomable ] = useState(false);
  const handleScrollZoomableToggle = () => {
    setScrollZoomable(!scrollZoomable);
  };

  const [ heatmapData, setHeatmapData ] = useState<HeatmapData>(generateDummyData(0, 0));
  useEffect(() => {
    if (heatmapDataInput) { validateHeatmapDataShape(heatmapDataInput) };
    setHeatmapData(() => heatmapDataInput || generateDummyData(100, 20));
  }, [heatmapDataInput]);

  const height = calculatePlotHeight(heatmapData.geneLabels.length);

  const downloadIcon = {
    width: 500,
    height: 600,
    path: "M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM216 232V334.1l31-31c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-72 72c-9.4 9.4-24.6 9.4-33.9 0l-72-72c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l31 31V232c0-13.3 10.7-24 24-24s24 10.7 24 24z",
  };

  return (
    <div className="my-4">
      <Plot
        className="overflow-hidden border border-stone-300 rounded-2xl shadow-lg min-h-[600px] w-full"
        data={[
          {
            type: "heatmap",
            z: heatmapData.tpmMatrix,
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
      <div className="my-3">
        <Toggle
          currState={scrollZoomable}
          handleChange={handleScrollZoomableToggle}
          prompt="Allow zoom on scroll"
        />
      </div>
    </div>
  );
}

export default ExpressionHeatmap
