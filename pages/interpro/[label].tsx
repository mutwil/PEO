import React from "react"
import Head from "next/head"
import { NextPage } from "next"
import { useRouter } from "next/router"

import Layout from "../../components/Layout"
import Header1 from "../../components/atomic/texts/Header1"
import InterproShowTable from "../../components/tables/InterproShowTable"
import { getOneGeneAnnotation } from "../../utils/geneAnnotations"

export const getServerSideProps: GetServerSideProps = async ({ params, query }) => {
  const geneAnnotation = await getOneGeneAnnotation({ type: "INTERPRO", label: params.label })

  // Unknown/retired PFAM accession must 404 rather than 500 — same fix as the
  // MapMan bin page.
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

const InterproShowPage: NextPage<IProps> = ({ geneAnnotation }) => {
  const router = useRouter()
  const label = router.query.label

  return (
    <Layout>
      <Head>
        <title>PFAM {label}</title>
      </Head>

      <Header1>PFAM {label}</Header1>
      <div className="mb-4">
        <p>{geneAnnotation.name}</p>
        <p><b>GO Terms:</b> {geneAnnotation.details.go_terms.join(", ")}</p>
      </div>
      <InterproShowTable data={geneAnnotation.gene_annotation_buckets} />
    </Layout>
  )
}

export default InterproShowPage
