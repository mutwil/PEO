import React from "react";
import { HeatmapData } from "../graphs/ExpressionHeatmap";
import download from "downloadjs";

interface HeatmapDownloadLinkProps {
  data: HeatmapData;
}

const HeatmapDownloadLink = ({ data }: HeatmapDownloadLinkProps) => {

  const sep = "\t";

  const handleDownload = () => {
    const headerLine = ["Gene", ...data.sampleAnnotationLabels].join(sep);
    const dataLines = data.geneLabels.map((gene, i) => {
      return [gene, ...data.tpmMatrix[i]].join(sep);
    })
    const tsvString = [headerLine, ...dataLines].join("\n");
    download(tsvString, "heatmap.tsv", "text/csv");
  };

  return (
    <div className="my-4">
      <button
        type="button"
        className="text-sm text-plb-green bg-white shadow hover:bg-plb-green hover:text-plb-light focus:outline-none focus:ring-4 focus:ring-green-300 rounded-full px-6 py-3 text-center disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={(e) => {
          e.preventDefault();
          handleDownload();
        }}
      >
        Download as tsv
      </button>
    </div>
  );
};

export default HeatmapDownloadLink;
