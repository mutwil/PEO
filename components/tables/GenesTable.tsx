import React from "react"

import TextLink from "../atomic/TextLink"
import VirtualPaginatedFilterTable, { IPropsFetchData } from "./generics/VirtualPaginatedFilterTable"

interface IProps {
  taxid: number
  initialGenes: object[]
  pageTotal: number
}

const GenesTable: React.FC<IProps> = ({ taxid, initialGenes, pageTotal }) => {
  const [ genesPage, setGenesPage ] = React.useState(initialGenes)
  const [ pageCount, setPageCount ] = React.useState(pageTotal)
  const [ loading, setLoading ] = React.useState(false)
  const fetchIdRef = React.useRef(0)

  const columns = React.useMemo(() => [
    {
      Header: "Gene ID",
      accessor: "label",
      Cell: ({ value }: { value: string }) => (
        <TextLink href={`/species/${taxid}/genes/${value}`}>
          {value}
        </TextLink>
      ),
      disableSortBy: true,
    },
    {
      Header: "Alias",
      accessor: "alias",
      disableSortBy: true,
    },
    {
      Header: "Mapman annotations",
      accessor: "geneAnnotations",
      Cell: ({ value: geneAnnotations }: { value: object[] }) => (
        <ul className="">
          {
            /* If gene annotation not in the DB, just display MAPMAN bin 35.2 */
            (geneAnnotations.length === 0) ? (
              <li className="mb-2 last:mb-0">
                not assigned.not annotated
              </li>
            ) :
            geneAnnotations.map(ga => (
              <li className="mb-2 last:mb-0" key={ga.label}>
                {ga.name}
              </li>
            ))
          }
        </ul>
      ),
      disableSortBy: true,
    },
  ], [taxid])

  const fetchGenePage = React.useCallback(({ pageSize, pageIndex, queryFilter=null, sortByObject={} }: IPropsFetchData) => {
    const fetchId = ++fetchIdRef.current
    setLoading(true)
    if (fetchId === fetchIdRef.current) {
      let apiUrl = `/api/species/${taxid}/genes?pageIndex=${pageIndex}&pageSize=${pageSize}`
      if (queryFilter) {
        apiUrl += `&queryFilter=${queryFilter}`
      }
      if (Object.keys(sortByObject).length > 0) {
        apiUrl += `&sortByObject=${JSON.stringify(sortByObject)}`
      }
      fetch(apiUrl)
      .then(res => res.json())
      .then((data) => {
          setGenesPage(data.genes)
          setPageCount(data.pageTotal)
          setLoading(false)
        })
        .catch(err => console.log(err))
    }
  }, [taxid])

  return (
    <VirtualPaginatedFilterTable
      columns={columns}
      data={genesPage}
      pageCount={pageCount}
      loading={loading}
      fetchData={fetchGenePage}
    />
  )
}

export default GenesTable
