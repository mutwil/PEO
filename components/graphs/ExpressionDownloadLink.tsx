import React from "react"

type HeaderType = [string, string, string, string]
type RowType = [string, string, string, number][]

const ExpressionDownloadLink = ({ taxid, geneLabel, sampleAnnotations }) => {
  const sep = "\t"

  const getShapedData = () => {
    const dataHeaders: HeaderType = [
      "Sample accession",
      "PO term",
      "PO name",
      "TPM",
    ]
    // Only run this when they want to download, not on every page load
    const dataRows: RowType = []
    sampleAnnotations.forEach(sa => {
      sa.tpms.forEach((tpm: number, i: number) => {
        dataRows.push([
          sa.sampleLabels[i],
          sa.label,
          sa.name,
          tpm,
        ])
      })
    })
    return [ dataHeaders, dataRows ]
  }

  const makeTsvString = ({ headers, rows }: { headers: HeaderType, rows: RowType }): string => {
    const tsvRows = [
      headers.join(sep),
      ...rows.map(row => row.join(sep))
    ]
    return tsvRows.join("\n") + "\n"
  }

  const handleDownload = () => {
    const [ dataHeaders, dataRows ] = getShapedData()
    const tsvString = makeTsvString({ headers: dataHeaders, rows: dataRows })
    const blob = new Blob([tsvString], { type: 'text/tsv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('href', url)
    a.setAttribute('download', `taxid${taxid}_${geneLabel}_profile.tsv`)
    a.click()
  }

  return (
    <div className="flex justify-end">
      {/* <TextLink href="#" onClick={handleDownload}>
        Download
      </TextLink> */}
      <button
        type="button"
        className="text-sm text-plb-green bg-white shadow hover:bg-plb-green hover:text-plb-light focus:outline-none focus:ring-4 focus:ring-green-300 rounded-full px-6 py-3 text-center disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={(e) => {
          e.preventDefault()
          handleDownload()
        }}
      >
        Download as tsv
      </button>
    </div>
  )
}

export default ExpressionDownloadLink
