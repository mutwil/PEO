import React from "react"
import { NextPage, GetServerSideProps } from "next"
import { useRouter } from "next/router"
import Head from "next/head"
import dynamic from "next/dynamic"

import Layout from "../../../../components/Layout"
import TextLink from "../../../../components/atomic/TextLink"
import MapmanSimpleTable from "../../../../components/tables/MapmanSimpleTable"
import InterproSimpleTable from "../../../../components/tables/InterproSimpleTable"
import Header1 from "../../../../components/atomic/texts/Header1"
import Header2 from "../../../../components/atomic/texts/Header2"
import ExpressionDownloadLink from "../../../../components/graphs/ExpressionDownloadLink"
import { TabBodyGroup, TabBodyItem, TabGroup, TabHeaderGroup, TabHeaderItem } from "../../../../components/atomic/tabs"
import TopSpmOrgansSection from "../../../../components/cards/TopSpmOrgansSection"
import PccTable from "../../../../components/tables/PccTable"

const ExpressionTabs = dynamic(() => import("../../../../components/graphs/ExpressionTabs"), {ssr: false})

import connectMongo from "../../../../utils/connectMongo"
import {
  findTopSpmSA,
  getSampleAnnotationsGraphData,
} from "../../../../utils/sampleAnnotations"
import { getOneSpecies } from "../../../../utils/species"
import { getOneGene } from "../../../../utils/genes"
import { capitalizeFirstLetter } from "../../../../utils/strings"

export const getServerSideProps: GetServerSideProps = async ({ params, query }) => {
  connectMongo()
  const species = await getOneSpecies(params.taxid)
  const gene = await getOneGene(species._id, params.geneLabel)
  const mapmanGas = gene.gene_annotations.filter(ga => ga.type === "MAPMAN")
  const interproGas = gene.gene_annotations.filter(ga => ga.type === "INTERPRO")
  const sampleAnnotations = await getSampleAnnotationsGraphData(params.taxid, params.geneLabel, "PO")
  const topSpmSasMean = findTopSpmSA(sampleAnnotations, 3, "mean")
  const topSpmSasMedian = findTopSpmSA(sampleAnnotations, 3, "median")


  return {
    props: {
      species: JSON.parse(JSON.stringify(species)),
      gene: JSON.parse(JSON.stringify(gene)),
      mapmanGas: JSON.parse(JSON.stringify(mapmanGas)),
      interproGas: JSON.parse(JSON.stringify(interproGas)),
      sampleAnnotations: JSON.parse(JSON.stringify(sampleAnnotations)),
      topSpmSasMean: JSON.parse(JSON.stringify(topSpmSasMean)),
      topSpmSasMedian: JSON.parse(JSON.stringify(topSpmSasMedian)),
    }
  }
}

interface GeneShowContextType {
  geneLabel: string
}

export const GeneShowContext = React.createContext<GeneShowContextType | null>(null)

const GenePage: NextPage = ({species, gene, mapmanGas, interproGas, sampleAnnotations, topSpmSasMean, topSpmSasMedian }) => {
  const router = useRouter()
  const { taxid, geneLabel } = router.query

  return (
    <Layout>
      <Head>
        <title>{`Gene ${geneLabel}`}</title>
      </Head>

      <GeneShowContext.Provider value={{ geneLabel: gene.label }}>
        <section className="mb-4">
          <Header1>Gene {geneLabel}</Header1>
          <p>Species name: <span className="italic">{species.name}</span></p>
          <p>Taxanomic ID: {taxid}</p>
          {gene.alias && gene.alias.length > 0 && (
            <div className="text-sm text-gray-500 mt-1">
              <span>Also known as: </span>
              {gene.alias.map((a, i) => (
                <span key={i}>
                  <span className="font-mono">{a.label}</span>
                  <span className="text-gray-400"> (pident: {a.pident}%, e-value: {a.evalue.toExponential(1)})</span>
                  {i < gene.alias.length - 1 && ", "}
                </span>
              ))}
            </div>
          )}
        </section>

        <div className="flex italic text-sm gap-2 my-3">
          <TextLink href="#top-spm">
            Organ specificity
          </TextLink>|
          <TextLink href="#expression-graph">
            Expression graph
          </TextLink>|
          <TextLink href="#mapman-annotations">
            Mapman annotations
          </TextLink>|
          <TextLink href="#interpro-annotations">
            PFAM annotations
          </TextLink>|
          <TextLink href="#coexpression-table">
            Co-expressed genes
          </TextLink>
        </div>

        <section className="mt-8 mb-4" id="top-spm">
          <Header2>Organ specificity</Header2>
          <div className="my-2">
            {!sampleAnnotations.length ? (
              <p>No annotated samples yet 😢</p>
            ) : (
              <p>For gene {geneLabel}, we found these organs to have the highest SPM values. Do explore and inspect the data distribution plot to make your inference.</p>
            )}
          </div>
          <TabGroup>
            <TabHeaderGroup>
              <TabHeaderItem key="spm-mean" tabIndex={0}>
                SPM by mean TPM
              </TabHeaderItem>
              <TabHeaderItem key="spm-median" tabIndex={1}>
                SPM by median TPM
              </TabHeaderItem>
            </TabHeaderGroup>
            <TabBodyGroup>
              <TabBodyItem key="spm-mean" tabIndex={0}>
                <TopSpmOrgansSection topSpmSas={topSpmSasMean} by="mean" />
              </TabBodyItem>
              <TabBodyItem key="spm-median" tabIndex={1}>
                <TopSpmOrgansSection topSpmSas={topSpmSasMedian} by="median" />
              </TabBodyItem>
            </TabBodyGroup>
          </TabGroup>
        </section>

        <section className="mt-10 mb-4" id="expression-graph">
          <Header2>Gene expression profile by organs</Header2>
          {!sampleAnnotations.length ? (
            <p>No annotated samples yet 😢</p>
          ) : (
            <>
              <ExpressionTabs sampleAnnotations={sampleAnnotations} />
              <ExpressionDownloadLink
                taxid={taxid}
                geneLabel={geneLabel}
                sampleAnnotations={sampleAnnotations}
              />
            </>
          )}
        </section>

        <section className="mt-10 mb-4" id="mapman-annotations">
          <Header2>Mapman annotations</Header2>
          <MapmanSimpleTable geneAnnotations={mapmanGas} />
        </section>

        <section className="mt-10 mb-4" id="interpro-annotations">
          <Header2>PFAM annotations</Header2>
          <InterproSimpleTable geneAnnotations={interproGas} />
        </section>

        <section className="mt-10 mb-4" id="coexpression-table">
          <Header2>Top co-expressed genes</Header2>
          {(!gene.neighbors || gene.neighbors.length === 0)
            ?
            <p>No coexpressed neighbors</p>
            :
            <PccTable taxid={species.tax} data={gene.neighbors} />
          }
        </section>
      </GeneShowContext.Provider>
    </Layout>
  )
}

export default GenePage
