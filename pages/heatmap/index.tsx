import { NextPage } from "next";
import Layout from "../../components/Layout";
import Head from "next/head";
import { useState } from "react";
import dynamic from "next/dynamic";
import Loader from "../../components/atomic/Loader";
import Header1 from "../../components/atomic/texts/Header1";

const ExpressionHeatmap = dynamic(
  () => import("../../components/graphs/ExpressionHeatmap"),
  {ssr: false},
);

const HeatmapPage: NextPage = () => {

  const [loading, setLoading] = useState(true);
  const hideLoader = () => setLoading(false);

  return (
    <Layout>
      <Head>Heatmap</Head>

      <section className="my-4">
        <Header1>Heatmap</Header1>
      </section>

      <section className="my-4">
        {loading && <Loader comment="Drawing the heatmap" />}
        <ExpressionHeatmap
          hideLoader={hideLoader}
          // geneLabels={geneLabels}
          // sampleAnnotationLabels={sampleAnnotationLabels}
          // tpmMatrix={tpmMatrix}
        />
      </section>
    </Layout>
  );
}

export default HeatmapPage
