import React from "react"
import TextLink from "../atomic/TextLink"

const ProteinSearchBox = ({submitSearchQuery}) => {
  const handleSubmit = (event) => {
    event.preventDefault()
    const cleanedSeq: string = event.target.proteinSeq.value
      .replace(/>|\s*/g, "")
      .toUpperCase()
    const cleanedSeqSet = new Set(cleanedSeq)
    const validAA = new Set("ARNDCQEGHILKMFPSTWYV")
    const isValid = [...cleanedSeqSet].reduce((isValid, letter) => isValid ? validAA.has(letter) : false)
    if (isValid) {
      submitSearchQuery(cleanedSeq)
    } else {
      alert(`Invalid sequence`)
    }
  }

  const sampleSeq = "MEEENQKSHRVSRKDQSGSHWSQGADEEPRARCSGKRCRSWAAAAIADCVALCCCPCAVVNIFTLAFVKVPWMIGRKCIGRGGPSKKRMKKINREDRFHHHHHHRRSAEMVSGGCCGGGDGDGEFDDHRFVVERDGSLTKEEAKTASLKEEEETRISARVEAERVWLELYQIGHLGFGRVSFTGIHQ"

  const loadExampleSeq = (event) => {
    event.preventDefault()
    const textarea: HTMLTextAreaElement = document.querySelector("textarea#proteinSeq")!
    textarea.value = sampleSeq
    textarea.focus()
  }

  return (
    <form action="#" id="proteinSeqForm" onSubmit={handleSubmit}>
      <div className="">
        <div className="my-4">
          <textarea
            className="outline-none p-4 w-full rounded-2xl shadow border border-stone-300 focus:ring ring-plb-green ring-offset-1 focus:border-green-plb"
            name="proteinSeq"
            id="proteinSeq"
            rows={8}
            placeholder="Enter protein sequence ... "
            // defaultValue=""
          />
        </div>
        <div className="flex my-4">
          <div className="flex-grow">
            <div className="mx-2">
              <TextLink
                href="#"
                moreClassName="visited:text-plb-green"  /* Override */
                onClick={loadExampleSeq}
              >
                Load example protein sequence
              </TextLink>
            </div>
            <div className="mx-2 mt-2">
              <TextLink href="/search">
                Search by gene identifiers instead
              </TextLink>
            </div>
          </div>
          <div className="">
            <button
              type="submit"
              className="text-xl text-plb-light bg-plb-green hover:bg-plb-dark-green focus:outline-none focus:ring-4 focus:ring-green-300 rounded-full px-6 py-3 text-center"
              >
              Search
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

export default ProteinSearchBox
