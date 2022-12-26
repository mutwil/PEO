import type { GetServerSideProps, NextPage } from 'next'
import Head from 'next/head'
import { ObjectId } from 'bson'

import Layout from '../../components/Layout'
import Species from '../../models/species'
import connectMongo from '../../utils/connectMongo'
import Table from '../../components/tables/SpeciesTable'
import React from 'react'
import Link from 'next/link'
import SpeciesIndexTable from '../../components/tables/SpeciesIndexTable'

export const getServerSideProps: GetServerSideProps = async () => {
  await connectMongo()
  const species = await Species.find({})
  
  return {
    props: {
      species: JSON.parse(JSON.stringify(species)),
    }
  }
}

const SpeciesIndexPage: NextPage = ({ species }) => {
  return (
    <Layout>
      <Head>
        <title>All species</title>
      </Head>
      
      <section>
        <h1 className="text-4xl font-medium my-3 mb-8">Species</h1>
        <p className="text-sm text-stone-400 my-2">Find your species of interest by either typing in the scientific name or by browsing the table below.</p>
        <SpeciesIndexTable data={species} />
      </section>
    </Layout>
  )
}

export default SpeciesIndexPage
