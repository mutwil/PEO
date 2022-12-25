import Head from "next/head"
import React from "react"

import Header1 from "../../components/atomic/texts/Header1"
import Layout from "../../components/Layout"
import PoIndexTable from "../../components/tables/PoIndexTable"

import poNameMap from '/public/data/po_name_map.json' assert {type: 'json'}

export const getServerSideProps: GetServerSideProps = async () => {
  const poTerms = Object.entries(poNameMap).map(([poTerm, poName]) => {
    return {
      poTerm: poTerm,
      poName: poName,
    }
  })

  return {
    props: {
      poTerms: poTerms
    },
  }
}


interface IProps {
  poTerms: object[]
}

const OrganIndexPage: NextPage<IProps> = ({ poTerms }) => {
  return (
    <Layout>
      <Head>
        <title>Plant Ontology Terms</title>
      </Head>

      <Header1>Plant Ontology (PO) Terms</Header1>
      This tool is still in beta.  Search and select for your organ/tissue/cell type of interest. By clicking on the PO Term link, you will be taken to a page that shows you which genes are specifically expressed in these organs.
      <PoIndexTable data={poTerms} />
    </Layout>
  )
}

export default OrganIndexPage
