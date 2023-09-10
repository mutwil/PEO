import { NextPage } from "next";
import Layout from "../../components/Layout";
import Head from "next/head";
import { useContext, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Loader from "../../components/atomic/Loader";
import Header1 from "../../components/atomic/texts/Header1";
import { GlobalStoreContext } from "../_app";
import { HeatmapData } from "../../components/graphs/ExpressionHeatmap";
import * as math from "mathjs";
// import { AnnotationMap, GeneUnit, Metric } from "../api/heatmap";
import po_name_map from "../../public/data/po_name_map.json" assert { type: "json" };;

const ExpressionHeatmap = dynamic(
  () => import("../../components/graphs/ExpressionHeatmap"),
  {ssr: false},
);

/**
 * These types and interfaces cannot be imported from /api pages.
 * Temporarily copy pasting the types here.
 * Eventually should define types in a shared folder accessed by API routes and frontend components
 */

export enum Metric {
  AVG_TPM = "avg_tpm",
  MED_TPM = "med_tpm",
  SPM = "spm",
  SPM_MED = "spm_med",
}

export interface GeneUnit {
  taxid: number;
  label: string;
}

export interface AnnotationMap {
  [key: string]: number;
}

const generateDummyData = (nRows = 10, nCols = 5): HeatmapData => {
  const sampleAnnotationNames = Array.from({ length: nCols }).map((_, i) => `Sample ${i + 1}`);
  const geneLabels = Array.from({ length: nRows }).map((_, i) => `Gene ${i + 1}`);
  const tpmMatrix = Array(geneLabels.length)
    .fill(null)
    .map((_, i) =>
      Array(sampleAnnotationNames.length)
        .fill(null)
        .map((_, j): number => (i + j) % 7 ? math.round(Math.random() * 100, 3) : 0)
    );

  return { sampleAnnotationNames, geneLabels, tpmMatrix };
}

const HeatmapPage: NextPage = () => {

  const { navigationPayload, setNavigationPayload } = useContext(GlobalStoreContext);

  const [ heatmapInput, setHeatmapInput ] = useState<string>("");
  const [ queryList, setQueryList ] = useState<GeneUnit[]>([]);

  const [ heatmapData, setHeatmapData ] = useState<HeatmapData>();
  const [ loading, setLoading ] = useState(false);
  const hideLoader = () => setLoading(false);

  useEffect(() => {
    if (navigationPayload) {
      setQueryList(navigationPayload);
      setHeatmapInput(
        navigationPayload
          .map((entry: GeneUnit) => `${entry.taxid} ${entry.label}`)
          .join("\n")
      );
      setNavigationPayload([]);  // reset cache in global store
    }
  }, []);

  useEffect(() => {
    if (queryList && queryList.length === 0) return;

    setLoading(true);
    fetch("/api/heatmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ genes: queryList, metric: Metric.AVG_TPM }),
    })
      .then(res => res.json())
      .then((data: AnnotationMap[]) => {
        setHeatmapData(mapHeatmapData(queryList, data));
      })
      .catch(err => console.log(err));
  }, [queryList]);

  const mapHeatmapData = (queryList: GeneUnit[], data: AnnotationMap[]): HeatmapData => {
    let sampleAnnotationLabels: string[] = [];
    let tpmMatrix: number[][] = [];
    const geneLabels = queryList.map(x => x.label);
    const setOfSas = new Set<string>(
      data.map(geneData => Object.keys(geneData)).flat()
    );
    sampleAnnotationLabels = Array.from(setOfSas);
    tpmMatrix = data.map(geneData => {
      return sampleAnnotationLabels.map((label) => geneData[label]);
    });
    const sampleAnnotationNames = sampleAnnotationLabels.map(label => po_name_map[label] || label);
    return { sampleAnnotationNames, geneLabels, tpmMatrix };
  }

  return (
    <Layout>
      <Head>Heatmap</Head>

      {/* <section className="my-4">
        <Header1>Heatmap</Header1>
        <details>
          <summary>Genes included in this plot</summary>
          <p className="my-4 italic text-stone-400">
            Each line identifies taxid, followed by gene identifier, separated
            by a whitespace.
          </p>
          <div className="my-4">
            <textarea
              disabled
              className="text-gray-400 outline-none p-4 w-full rounded-2xl shadow border border-stone-300 focus:ring-2 focus:ring-plb-green focus:border-plb-green"
              name="heatmapInput"
              id="heatmapInput"
              rows={8}
              placeholder="Enter taxid and gene identifiers separated by space"
              value={heatmapInput}
              onChange={(e) => setHeatmapInput(e.target.value)}
            />
          </div>
        </details>
      </section> */}

      <section className="my-4">
        {loading && <Loader comment="Drawing the heatmap" />}
        {heatmapData && (
          <ExpressionHeatmap
            heatmapData={heatmapData}
            hideLoader={hideLoader}
          />
        )}
        {/* {!heatmapData && (
          <ExpressionHeatmap
            heatmapData={generateDummyData(100, 20)}
            hideLoader={hideLoader}
          />
        )} */}
        {!heatmapData && !loading && <p>No data yet</p>}
      </section>
    </Layout>
  );
}

export default HeatmapPage
