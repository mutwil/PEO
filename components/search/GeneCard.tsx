import React from "react"
import Link from "next/link"

interface AliasEntry {
  label: string
  pident: number
  evalue: number
}

interface IProps {
  label: string
  alias: AliasEntry[]
  speciesName: string
  taxid: number
}

const GeneCard: React.FC<IProps> = ({ label, alias, speciesName, taxid }) => {
  return (
    <div className="bg-white border rounded-xl drop-shadow-md my-3 p-4">
      <div className="my-3">
        <span className="bg-green-100 text-green-800 text-sm font-medium rounded-full px-2.5 py-0.5">
          Gene
        </span>
      </div>
      <h3 className="text-lg font-medium pb-1">
        <Link href={`/species/${taxid}/genes/${label}`}>
          <a className="text-plb-green hover:underline active:text-plb-red">
            {label}
          </a>
        </Link>
      </h3>
      <p className="">
        Species: <span className="italic">{speciesName}</span> (Tax ID {taxid})
      </p>
      {alias && alias.length > 0 && (
        <div className="text-sm text-gray-500 mt-1">
          <span>Also known as: </span>
          {alias.map((a, i) => (
            <span key={i}>
              <span className="font-mono">{a.label}</span>
              <span className="text-gray-400"> (pident: {a.pident}%, e-value: {a.evalue.toExponential(1)})</span>
              {i < alias.length - 1 && ", "}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default GeneCard
