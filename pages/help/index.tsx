import React from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import type { NextPage } from 'next'

import Layout from '../../components/Layout'
import SearchBox from '../../components/search/SearchBox'
import Pagination from "../../components/search/Pagination"
import ResultsCardList from "../../components/search/ResultsCardList"
import TextLink from '../../components/atomic/TextLink'

const GlobalSearchPage: NextPage = ({}) => {
  const router = useRouter()

  const [ loading, setLoading ] = React.useState(false)
  const [ queryTerm, setQueryTerm ] = React.useState("")
  const [ results, setResults ] = React.useState({
    pageIndex: 0,
    pageTotal: 0,
    numGenes: 0,
    genes: []
  })

  return (
    <Layout>
      <Head>
        <title>Help</title>
      </Head>
      <h1 className="text-4xl py-3">Searching the database</h1>


      <section className="pt-4 my-4" id="helptext">


            {/* genes*/} 
            <h3 className="text-2xl font-medium mb-4">Searching by gene ID</h3>
            <p className="text-sm text-stone-400 my-2">You can find your gene of interest by typing in the ID on the front page. For example, typing in <TextLink href="/species/3702/genes/AT4G32410">AT4G31410</TextLink> will take you to the page of this gene from Arabidopsis.</p>
            <img src="/images/ID_search.png" width="700"></img>
            <br></br>

            {/* protein seq*/}
            <h3 className="text-2xl font-medium mb-4">Searching by protein sequence similarity</h3>
            <p className="text-sm text-stone-400 my-2">If you have a protein sequence available, you can find similar proteins with <TextLink href="/search/proteins">DIAMOND</TextLink>-based search</p>
            <img src="/images/sequence.PNG" width="700"></img>
            <br></br>

            {/* PFAM*/}
            <h3 className="text-2xl font-medium mb-4">Searching by PFAM domains</h3>
            <p className="text-sm text-stone-400 my-2">If you have a protein domain in mind, you can navigate to <TextLink href="/iterpro">PFAM</TextLink> page. There, you can type in e.g., <i>cellulose</i>, which will show you all PFAM domains containing this word in their description. By clicking on the link of a domain, (e.g., <TextLink href="/interpro/PF03552">PF03552</TextLink>), you will be shown all genes that have this domain.</p>
            <img src="/images/pfam.PNG" width="700"></img>
            <br></br>

            {/* Mapman*/}
            <h3 className="text-2xl font-medium mb-4">Searching by Mapman functional terms</h3>
            <p className="text-sm text-stone-400 my-2">You can search by biological functions with <TextLink href="/mapman">Mapman</TextLink> page, which will show you 31 bins capturing various aspects of gene functions in plants. For example, if you are working on cellulose synthesis, click on <TextLink href="/mapman/subbins/21">Cell wall organisation</TextLink> bin, and select the sub-bin of interest on the next page.</p>
            <img src="/images/mapman.PNG" width="700"></img>
            <br></br>

            {/* Species*/}
            <h3 className="text-2xl font-medium mb-4">Searching by browsing species gene pages</h3>
            <p className="text-sm text-stone-400 my-2">If you have a species in mind, navigate to  <TextLink href="/species">Species</TextLink> page, and click on your species of interest. For example, if you are working on cellulose synthesis in poplar, enter <i>populus</i> in the search box, click on click on <TextLink href="/species/3694">Populus trichocarpa</TextLink> and then write <i>cellulose</i> in the search box.</p>
            <img src="/images/species.PNG" width="700"></img>

            <br></br>
            <p className="text-sm text-stone-400 my-2">For any questions/bug reports, please write to Marek Mutwil at: mutwil [at] gmail.com.</p>
            

      </section>
    </Layout>
  )
}

export default GlobalSearchPage
