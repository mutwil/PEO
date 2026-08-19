import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import type { NextPage } from 'next'

import Layout from '../../components/Layout'
import ProteinSearchBox from '../../components/search/ProteinSearchBox'
import ProteinResultTable from '../../components/tables/ProteinResultTable'
import SearchProgress from '../../components/search/SearchProgress'

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
  const [ errorMessage, setErrorMessage ] = React.useState<string | null>(null)
  const [ lastSearchSeconds, setLastSearchSeconds ] = React.useState<number | null>(null)

  const handleFailure = (err, message?: string) => {
    setQueryStatus(QueryStatus.FAILED)
    setErrorMessage(message ?? null)
    console.log(err)
  }

  /*
    STEP 1: Query the diamond search API (FastAPI)
    to get the diamond hits for this protein sequence
  */
  const submitSearchQuery = async (query: string) => {
    setQueryStatus(QueryStatus.SEARCHING)
    setErrorMessage(null)
    setLastSearchSeconds(null)
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
      .then(async res => {
        /*
          The search service returns structured errors for the cases users
          actually hit, so surface those rather than a generic failure:
            503 - another search is already running (searches are serialised,
                  since one saturates the server's 2 CPUs)
            504 - the search itself exceeded the server-side time limit
            422 - the sequence failed validation
        */
        if (!res.ok) {
          let detail = ""
          try {
            detail = (await res.json())?.detail ?? ""
          } catch { /* non-JSON error body; fall through to generic message */ }

          if (res.status === 503) {
            throw new Error(detail || "Another protein search is currently running. Please try again in a minute.")
          }
          if (res.status === 504) {
            throw new Error("The search took too long and was stopped. Very long or low-complexity sequences can exceed the time limit — try a shorter or more specific sequence.")
          }
          if (res.status === 422) {
            throw new Error(detail || "That sequence could not be read as a protein sequence.")
          }
          throw new Error(detail || `Search failed (HTTP ${res.status}).`)
        }
        return res.json()
      })
      .then(data => {
        if (typeof data.elapsed_seconds === "number") {
          setLastSearchSeconds(data.elapsed_seconds)
        }
        processAndSetResults(data.result, data.status)
      })
      .catch(err => handleFailure(err, err?.message))
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
        Cell: ({ value, row }) => {
          /*
            Only link hits that actually resolve to a gene in the expression
            database. The DIAMOND database is built from peptide FASTAs that
            include sequences with no expression record here (and for some
            species use a different gene-ID namespace entirely), so linking
            every hit produced dead links. Link via resolved_label, which is
            the canonical gene label and always resolves.
          */
          const original = row.original ?? {}
          if (!original.has_expression_data) {
            return (
              <span
                className="text-stone-500"
                title="This protein has no expression data in PEO, so there is no gene page to open."
              >
                {value}
              </span>
            )
          }
          return (
            <Link href={`/species/${row.values.taxid}/genes/${original.resolved_label ?? value}`}>
              <a className="hover:underline text-plb-green active:text-plb-red">{value}</a>
            </Link>
          )
        },
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
          <SearchProgress />
        )}
        {queryStatus && queryStatus === QueryStatus.SUCCESS && (
          <>
            {lastSearchSeconds !== null && (
              <p className="my-3 text-sm text-stone-500">
                Found {results.length} match{results.length === 1 ? "" : "es"} in {lastSearchSeconds}s.
              </p>
            )}
            <ProteinResultTable columns={columns} data={results} />
          </>
        )}
        {queryStatus && queryStatus === QueryStatus.FAILED && (
          <div className="my-3 p-4 border border-red-200 bg-red-50 rounded-lg">
            <p className="font-medium text-red-800">Search failed</p>
            <p className="text-sm text-red-700 mt-1">
              {errorMessage ?? "Something went wrong while searching your protein sequence."}
            </p>
          </div>
        )}
      </section>
    </Layout>
  );
}

export default ProteinSearchPage
