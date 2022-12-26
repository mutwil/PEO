import React from "react"

import LocalPaginatedTable from "./generics/LocalPaginatedTable"
import TextLink from "../atomic/TextLink"

const SpeciesIndexTable = ({ data }) => {
  const columns = React.useMemo(
    () => [
      {
        Header: "Tax ID",
        accessor: "tax",
        Cell: ({ value }) => {
          return (
            <TextLink href={`/species/${value}`}>
              {value}
            </TextLink>
          )
        },
      },
      {
        Header: "Scientific name",
        accessor: "name",
      },
      /*          
      {
        Header: "Alias",
        accessor: "alias",
      },*/
      {
        Header: "Source",
        accessor: "cds.source",
      },
      {
        Header: "Source url",
        accessor: "cds.url",
        Cell: ({ value }) => (
          <p className="break-all">
            {value}
          </p>
        ),
      },
    ], []
  )

  return (
    <LocalPaginatedTable
      columns={columns}
      data={data}
    />
  )
}

export default SpeciesIndexTable
