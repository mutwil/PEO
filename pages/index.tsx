import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'

import Layout from '../components/Layout'
import SearchBox from '../components/search/SearchBox'
import TextLink from '../components/atomic/TextLink'

const Home: NextPage = () => {
  const router = useRouter()

  const getGenesSuggestions = async (query) => {
    const genes = await fetch(`/api/search/geneLabels?searchTerm=${query}`)
      .then(res => res.json())
      .then(data => data.genes)
    return genes
  }

  return (
    <Layout>
      <Head>
        <title>Plant Gene Expression Omnibus</title>
      </Head>

      <section id="home-banner-section">
        <div className="pt-16 pb-8" id="home-banner-img-container">
          <div className="relative w-64 h-64 mx-auto drop-shadow-2xl" id="home-banner-img">
            <Image
              src="/images/binary-code-bro-green.svg"
              alt="home banner image"
              layout="fill"
              objectFit="cover"
              priority
            />
          </div>
        </div>
        <div className="text-center drop-shadow" id="home-banner-text">
          <h1 className="text-4xl py-3">
            Plant Gene Expression Omnibus
          </h1>
          <p className="text-xl py-3">
            The largest annotated gene expression resource for{" "}
            <Link href="/species">
              <a className="hover:underline active:text-plb-green">
                <span className="font-bold text-xl text-plb-red">100</span> plant species
              </a>
            </Link>
          </p>
        </div>
      </section>

      <section className="py-4" id="home-search-global">
        <div className="max-w-4xl mx-auto my-4" id="search-box">
          {/*
            * Give suggestions
            * Redirect to search page on enter
          */}
          <SearchBox
            initialValue=""
            placeholder="Enter your gene ID"
            getSuggestions={getGenesSuggestions}
            submitSearchQuery={(query: string) => {
              router.push({
                pathname: "/search",
                query: {...router.query, searchTerm: query, loadResults: true}
              },)
            }}
            handleSelectRedirect={(geneId: string) => {
              fetch(`/api/search/geneParams/${geneId}`)
                .then(res => res.json())
                .then(gene => {
                  const taxid = gene.species.tax
                  const geneLabel = gene.label
                  router.push({
                    pathname: `/species/${taxid}/genes/${geneLabel}`
                  })
                })
            }}
          />
          Examples: <TextLink href="/species/3702/genes/AT4G32410"> AT4G31410</TextLink> <TextLink href="/species/4530/genes/LOC_OS01G06450.1">LOC_OS01G06450</TextLink>
        </div>
      </section>

      <section id="home-other-actions">
        <div className="flex justify-center my-1.5">
        Alternatively, search by:  <TextLink href="/search/proteins">protein sequence similarity</TextLink>, <TextLink href="/interpro"> protein domains</TextLink>, <TextLink href="/mapman"> biological functions</TextLink> or <TextLink href="/species"> species.</TextLink>
        </div>
      </section>
    </Layout>
  )
}

export default Home
