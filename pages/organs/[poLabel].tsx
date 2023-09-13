import Head from "next/head"
import { useRouter } from "next/router"
import React, { useContext } from "react"
import Select from 'react-select'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'

import Header1 from "../../components/atomic/texts/Header1"
import Layout from "../../components/Layout"
import OrganShowTableMedian from "../../components/tables/OrganShowTableMedian"
import OrganShowTableMean from "../../components/tables/OrganShowTableMean"
import { getOrganSpecificSasByMedian, getOrganSpecificSasByMean } from "../../utils/sampleAnnotations"
import { getSpeciesHavingOrgan } from "../../utils/species"
import { TabGroup, TabHeaderGroup, TabHeaderItem, TabBodyGroup, TabBodyItem } from "../../components/atomic/tabs"
import Species from "../../models/species"
import TextLink from "../../components/atomic/TextLink"
import { GlobalStoreContext } from "../_app"

import poNameMap from '/public/data/po_name_map.json' assert {type: 'json'}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const poTerm = params.poLabel as string
  // const species = await getAllSpecies()
  const species = await getSpeciesHavingOrgan(poTerm)

  const topSpmByMedianResult = await getOrganSpecificSasByMedian({
    poLabel: poTerm,
    speciesId: species[0]._id,
  })
  const topSpmByMeanResult = await getOrganSpecificSasByMean({
    poLabel: poTerm,
    speciesId: species[0]._id,
  })

  return {
    props: {
      poName: poNameMap[poTerm],
      species: JSON.parse(JSON.stringify(species)),
      topSpmByMedianResult: JSON.parse(JSON.stringify(topSpmByMedianResult)),
      topSpmByMeanResult: JSON.parse(JSON.stringify(topSpmByMeanResult)),
    },
  }
}

interface ITopSpmResult {
  numSasTotal: number
  pageTotal: number
  pageIndex: number
  sas: object[]
}

interface IProps {
  species: (typeof Species)[]
  poName: string
  topSpmByMedianResult: ITopSpmResult
  topSpmByMeanResult: ITopSpmResult
}

const OrganShowPage: NextPage<IProps> = ({ poName, species, topSpmByMedianResult, topSpmByMeanResult }) => {

  const { setNavigationPayload } = useContext(GlobalStoreContext);

  const router = useRouter()
  const poLabel = router.query.poLabel as string
  const capsPoName = poName.charAt(0).toUpperCase() + poName.slice(1).toLowerCase()

  const speciesOptions = species.map(sp => ({
    value: sp._id,
    label: sp.name,
    taxid: sp.tax,
  }))

  const [ selectedSpecies, setSelectedSpecies ] = React.useState(speciesOptions[0])

  const handleNavigateToHeatmap = (event, spmType: "mean" | "median") => {
    event.preventDefault();
    const taxid = selectedSpecies.taxid;
    const payload = topSpmByMeanResult.sas
      .map(sa => sa.gene.label)
      .map(label => ({ taxid, label }));
    setNavigationPayload(payload);
    router.push("/heatmap");
  }

  return (
    <Layout>
      <Head>
        <title>{poLabel}</title>
      </Head>

      <section className="mb-4">
        <Header1>{capsPoName}</Header1>
        <p className="mb-1">{poLabel}</p>
        {/* TODO: explainer on plant ontology terms */}
        <p className="mb-1">
          Explore genes that are expressed specifically in the {poName}.
        </p>
        <p className="text-stone-500 text-sm italic">
          Context-specific expression is quantified with the SPM measure. The
          SPM is conventionally calculated by considering the mean TPM of each
          organ. However, this is prone to distortion due to extreme outliers.
          We provide the results from SPM using both mean and median here.
        </p>
      </section>

      {/* TODO: Abstract the select box into a component */}
      <div className="my-3">
        <div className="flex items-center mb-2">
          <FontAwesomeIcon icon={faMagnifyingGlass} />
          <label
            htmlFor="speciesSelect"
            className="block ml-1.5 text-sm font-medium text-gray-900"
          >
            Select a species
          </label>
        </div>
        {/* <p>Selected species taxid: {JSON.stringify(selectedSpecies)}</p>
        <p>Selected species taxid: {JSON.stringify(selectedSpeciesId)}</p> */}
        <Select
          defaultValue={speciesOptions[0]}
          options={speciesOptions}
          noOptionsMessage={() => "No such species"}
          onChange={(choice) => {
            setSelectedSpecies(choice);
          }}
          closeMenuOnScroll={true}
          closeMenuOnSelect={true}
          // unstyled={true}
          // classNames={{
          //   // container: () => "",
          //   container: () => "outline-none w-full rounded-full shadow border border-stone-300 focus:ring focus:ring-1 focus:ring-plb-green focus:border-plb-green",
          //   control: () => "outline-none w-full rounded-full shadow border border-stone-300 focus:ring focus:ring-1 focus:ring-plb-green focus:border-plb-green",
          // }}
          styles={{
            control: (baseStyles, state) => ({
              ...baseStyles,
              borderRadius: "9999px",
              padding: "0.375rem",
              outline: "2px solid transparent",
              outlineOffset: "2px",
            }),
          }}
        />
      </div>

      <TabGroup>
        <TabHeaderGroup>
          <TabHeaderItem key="spm-mean" tabIndex={0}>
            SPM (through mean TPM)
          </TabHeaderItem>
          <TabHeaderItem key="spm-median" tabIndex={1}>
            SPM (through median TPM)
          </TabHeaderItem>
        </TabHeaderGroup>
        <TabBodyGroup>
          <TabBodyItem key="spm-mean" tabIndex={0}>
            <div className="my-4">
              <TextLink
                href={"#"}
                onClick={(e) => handleNavigateToHeatmap(e, "mean")}
                className="italic"
              >
                Checkout heatmap of top 50 genes
              </TextLink>
            </div>
            <OrganShowTableMean
              poLabel={poLabel}
              speciesId={selectedSpecies.value}
              initialSaPage={topSpmByMeanResult.sas}
              pageTotal={topSpmByMeanResult.pageTotal}
            />
          </TabBodyItem>
          <TabBodyItem key="spm-median" tabIndex={1}>
            <div className="my-4">
              <TextLink
                href={"#"}
                onClick={(e) => handleNavigateToHeatmap(e, "median")}
                className="italic"
              >
                Checkout heatmap of top 50 genes
              </TextLink>
            </div>
            <OrganShowTableMedian
              poLabel={poLabel}
              speciesId={selectedSpecies.value}
              initialSaPage={topSpmByMedianResult.sas}
              pageTotal={topSpmByMedianResult.pageTotal}
            />
          </TabBodyItem>
        </TabBodyGroup>
      </TabGroup>
    </Layout>
  );
}

export default OrganShowPage
