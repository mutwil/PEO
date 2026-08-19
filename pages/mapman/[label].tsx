import React from "react"
import Head from "next/head"
import { NextPage } from "next"
import { useRouter } from "next/router"

import { getOneGeneAnnotation } from "../../utils/geneAnnotations"

import Layout from "../../components/Layout"
import Header1 from "../../components/atomic/texts/Header1"
import MapmanShowTable from "../../components/tables/MapmanShowTable"

export const getServerSideProps: GetServerSideProps = async ({ params, query }) => {
  const geneAnnotation = await getOneGeneAnnotation({ type: "MAPMAN", label: params.label })

  /*
    A bin code that isn't in the database must 404, not 500. This is reachable
    in normal use: MapMan bin codes change between Mercator releases, and PEO
    v0.2 removed 1015 bins that no gene is assigned to (Mercator's new Bin 29
    "Plant organogenesis" absorbed many former Bin 28 genes). Old links, cached
    search results and the reviewer's bookmarks all still point at those codes,
    and dereferencing the null here returned a server error for every one.
  */
  if (!geneAnnotation) {
    return { notFound: true }
  }

  return {
    props: {
      geneAnnotation: JSON.parse(JSON.stringify(geneAnnotation))
    }
  }
}

interface IProps {
  geneAnnotation: object
}

const MapmanShowPage: NextPage<IProps> = ({ geneAnnotation }) => {
  const router = useRouter()
  const label = router.query.label

  return (
    <Layout>
      <Head>
        <title>Mapman Bin {label}</title>
      </Head>

      <Header1>Mapman Bin {label}</Header1>
      <div className="mb-4">
        <p><b>Bin name:</b> {geneAnnotation.name}</p>
        <p><b>Description:</b> {geneAnnotation.details.desc}</p>
      </div>
      <MapmanShowTable data={geneAnnotation.gene_annotation_buckets} />
    </Layout>
  )
}

export default MapmanShowPage
