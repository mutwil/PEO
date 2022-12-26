import React from 'react'
import Head from "next/head"
import { GetServerSideProps, NextPage } from 'next'

import Layout from '../../components/Layout'
import Header1 from '../../components/atomic/texts/Header1'
import { getGeneAnnotationsPage } from '../../utils/geneAnnotations'
import InterproIndexTable from '../../components/tables/InterproIndexTable'

export const getServerSideProps: GetServerSideProps = async () => {
  const page = await getGeneAnnotationsPage({type: "INTERPRO"})

  return {
    props: {
      geneAnnotations: JSON.parse(JSON.stringify(page.geneAnnotations)),
      numGeneAnnotations: JSON.parse(JSON.stringify(page.pageTotal))
    }
  }
}

interface IProps {
  geneAnnotations: object[]
  numGeneAnnotations: number
}

const PfamIndexPage: NextPage<IProps> = ({ geneAnnotations, numGeneAnnotations }) => {
  return (
    <Layout>
      <Head>
        <title>PFAM annotations</title>
      </Head>

      <Header1>PFAM terms</Header1>
      <p className="text-sm text-stone-400 my-2">Search for the Pfam domains by entering Pfam IDs or by a keyword (e.g., cellulose). Then, click on the Pfam ID link to see which genes and species contain this domain.</p>

      <InterproIndexTable
        initialGeneAnnotations={geneAnnotations}
        pageTotal={numGeneAnnotations}
      />
    </Layout>
  )
}

export default PfamIndexPage
