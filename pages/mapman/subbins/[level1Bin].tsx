import React from "react"
import Head from "next/head"
import { GetServerSideProps, NextPage } from "next"
import { useRouter } from "next/router"

import Layout from "../../../components/Layout"
import Header1 from "../../../components/atomic/texts/Header1"
import { getMapmanLevel1Bins, getMapmanSubbinsPage } from "../../../utils/geneAnnotations"
import TextLink from "../../../components/atomic/TextLink"
import MapmanSubbinIndexTable from "../../../components/tables/MapmanSubbinIndexTable"

export const getServerSideProps: GetServerSideProps = async ({ params, query }) => {
  const level1Bins = await getMapmanLevel1Bins()
  const level1BinsNameMap = level1Bins.reduce((collector, curr) => {
    collector[curr.bincode] = curr.binname
    return collector
  }, {})

  const level1Bin = parseInt(params.level1Bin as string)
  const page = await getMapmanSubbinsPage({ level1Bin })

  return {
    props: {
      level1BinsNameMap: JSON.parse(JSON.stringify(level1BinsNameMap)),
      geneAnnotations: JSON.parse(JSON.stringify(page.geneAnnotations)),
      numGeneAnnotations: JSON.parse(JSON.stringify(page.pageTotal)),
    }
  }
}

interface IProps {
  level1BinsNameMap: object
  geneAnnotations: object[]
  numGeneAnnotations: number
}

const MapmanSubbinIndexPage: NextPage<IProps> = ({ level1BinsNameMap, geneAnnotations, numGeneAnnotations }) => {
  const router = useRouter()
  const level1Bin = parseInt(router.query.level1Bin as string)

  return (
    <Layout>
      <Head>
        <title>{`Mapman Bin ${level1Bin}`}</title>
      </Head>

      <div className="italic">
        <TextLink href="/mapman">
          Go back to the parent bins
        </TextLink>
      </div>
      <p className="text-sm text-stone-400 my-2">Here, you see all children bins of the bin you selected. Find your bin of interest here and click on the bincode.</p>

      <Header1>{level1BinsNameMap[level1Bin]}</Header1>
      <div className="mb-4">
        <p>Mapman Bin {level1Bin}</p>
      </div>

      <MapmanSubbinIndexTable
        level1Bin={level1Bin}
        initialGeneAnnotations={geneAnnotations}
        pageTotal={numGeneAnnotations}
      />
    </Layout>
  )
}

export default MapmanSubbinIndexPage
