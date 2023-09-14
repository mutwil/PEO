import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import type { NextPage } from 'next'

import Layout from '../../components/Layout'
import ProteinSearchBox from '../../components/search/ProteinSearchBox'
import ProteinResultTable from '../../components/tables/ProteinResultTable'

enum QueryStatus {
  FAILED = "failed",
  SEARCHING = "searching",
  SUCCESS = "success",
}

export async function getServerSideProps(context) {
  return {
    props: {
      DIAMOND_URL: process.env.DIAMOND_URL
    },
  }
}

const ProteinSearchPage: NextPage = ({ DIAMOND_URL }) => {
  const [ results, setResults ] = React.useState([])
  const [ queryStatus, setQueryStatus ] = React.useState<QueryStatus | null>(null)

  const handleFailure = (err) => {
    setQueryStatus(QueryStatus.FAILED)
    console.log(err)
  }

  /*
    STEP 1: Query the diamond search API (FastAPI)
    to get the diamond hits for this protein sequence
  */
  const submitSearchQuery = async (query: string) => {
    setQueryStatus(QueryStatus.SEARCHING)
    fetch(
      `${DIAMOND_URL}/queries/proteins/wait`, {
        method: "POST",
        body: JSON.stringify({
          protein_seq: query,
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      }
    )
      .then(res=>res.json())
      .then(data=>{
        processAndSetResults(data.result, data.status)
      })
      .catch(err => handleFailure(err))
  }

  /*
    STEP 2: For each query hit,
    find the species name
    and the gene's mapman annotation
  */
  const processAndSetResults = async (rawResults: object[], status: string) => {
    const gene_targets = rawResults.map(res => {
      return { taxid: res.taxid, gene_label: res.target}
    })

    fetch(
      `/api/names/speciesAndGenes`, {
        method: "POST",
        body: JSON.stringify(gene_targets),
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      }
    )
      .then(res => res.json())
      .then(names => {
        const newResults = rawResults.map((old_result, i) => {
          return {
            ...old_result,
            species_name: names[i].species_name,
            gene_names: names[i].names,
          }
        })
        setResults(newResults)
        setQueryStatus(QueryStatus.SUCCESS)
      })
      .catch(err => handleFailure(err))
  }

  const columns = React.useMemo(
    () => [
      {
        Header: "Gene identifier",
        accessor: "target",
        Cell: ({ value, row }) => (
          <Link href={`/species/${row.values.taxid}/genes/${value}`}>
            <a className="hover:underline text-plb-green active:text-plb-red">{value}</a>
          </Link>
        ),
      },
      /* Hide this column "taxid" under `setInitialState` in `useTable` hook call */
      {
        Header: "Taxanomic ID",
        accessor: "taxid",
        Cell: ({ value }) => (
          <Link href={`/species/${value}`}>
            <a className="hover:underline text-plb-green active:text-plb-red">{value}</a>
          </Link>
        ),
      },
      {
        Header: "Species",
        accessor: "species_name",
        Cell: ({ value, row }) => (
          <Link href={`/species/${row.values.taxid}`}>
            <a className="hover:underline text-plb-green active:text-plb-red">{value}</a>
          </Link>
        ),
      },
      {
        Header: "Mapman terms",
        accessor: "gene_names",
        Cell: ({ value }) => value ? value.join(", ") : "",
      },
      {
        Header: "% identity",
        accessor: "p_identity",
      },
      {
        Header: "E-value",
        accessor: "e_value",
      },
      {
        Header: "Bit score",
        accessor: "bit_score",
      },
      {
        Header: "Alignment length",
        accessor: "algn_length",
      },
      {
        Header: "Mismatches",
        accessor: "mismatches",
      },
      {
        Header: "Gap openings",
        accessor: "gap_openings",
      },
    ], []
  )

  return (
    <Layout>
      <Head>
        <title>Protein sequence search</title>
      </Head>

      <h1 className="text-4xl py-3">Protein sequence search</h1>

      <section className="my-4" id="search-box">
        <ProteinSearchBox submitSearchQuery={submitSearchQuery} />
      </section>

      <section>
        {queryStatus && queryStatus === QueryStatus.SEARCHING && (
          <p className="my-3">Searching up your protein sequence ...</p>
        )}
        {queryStatus && queryStatus === QueryStatus.SUCCESS && (
          <ProteinResultTable columns={columns} data={results} />
        )}
        {queryStatus && queryStatus === QueryStatus.FAILED && (
          <p className="my-3">Failed to search your protein sequence ...</p>
        )}
      </section>
    </Layout>
  );
}

export default ProteinSearchPage
