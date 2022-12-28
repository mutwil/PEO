import React from "react"

import LocalSimpleTable from "./generics/LocalSimpleTable"
import TextLink from "../atomic/TextLink"
import download from "downloadjs"
import Papa from "papaparse"

const PccTable = ({ taxid, data }) => {
  const columns = React.useMemo(
    () => [
      {
        Header: "Gene",
        accessor: "gene.label",
        Cell: ({ value }) => (
          <TextLink href={`/species/${taxid}/genes/${value}`}>
            {value}
          </TextLink>
        ),
        disableSortBy: true,
      },
      {
        Header: "Description",
        accessor: row => row.gene.mapman_annotations.map(anot => anot.name),
        Cell: ({ row }) => {
          const anots = row.original.gene.mapman_annotations
          if (anots && anots.length > 0) {
            return anots.map(ga => (
              <p className="mt-1.5 first:mt-0" key={ga._id}>{ga.name}</p>
            ))
          }
          return (<p>not assigned.not annotated</p>)
        },
        disableSortBy: true,
      },
      {
        Header: "PCC Value",
        accessor: "pcc",
      },
    ], []
  );

  const handleDownload = () => {
    const formattedData = data.map(row => ({
      "Gene": row.gene.label,
      "Description": row.gene.mapman_annotations.map(anot => anot.name).join(", "),
      "PCC Value": row.pcc,
    }))
    const csvData = Papa.unparse(formattedData)
    download(csvData, "table.csv", "text/csv")
  }

  return (
    <div>
    <LocalSimpleTable
      columns={columns}
      data={data}
      hiddenColumns={["tax"]}
      autofocus={false}
    />
    <button onClick={handleDownload}>Download Table</button>
    </div>
  )
}



export default PccTable
