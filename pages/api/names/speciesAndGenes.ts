import type { NextApiRequest, NextApiResponse } from 'next'

import { getManyGenes } from '../../../utils/genes'
import { getManySpecies } from '../../../utils/species'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  switch (req.method) {
    case "POST":
      try {
        // The raw array of {taxid, gene_label} objects
        // derived from diamond search API
        const hits = req.body
        // Call Next.js's API to get species name and _id
        const species = await getManySpecies(hits.map(hit => hit.taxid))
        // Not every DIAMOND hit necessarily has a matching species/gene doc in
        // Mongo (e.g. sequence-ID conventions differ between the DIAMOND
        // reference FASTA and the TPM-matrix-derived gene labels we store).
        // Guard against null lookups instead of crashing the whole request.
        hits.forEach((hit, i) => {
          if (species[i] && species[i].tax === hit.taxid) {
            hit.species_name = species[i].name
            hit.species_id = species[i]._id
          }
        })
        // Call Next.js's API to get gene's gene annotations
        // to retrieve MAPMAN annotations (if any)
        const genes = await getManyGenes(hits)
        hits.forEach((hit, i) => {
          /*
            Do NOT compare genes[i].label to hit.gene_label here. getManyGenes
            resolves each hit by label OR alias OR isoform-stripped label, so a
            successful match frequently has a *different* label than the hit
            reported (e.g. hit CDY37514 resolves to gene GSBRNA2T00039197001).
            The previous equality check silently discarded annotations for every
            such gene.

            resolved_label is the canonical label to link to — linking by the
            raw DIAMOND identifier works only when it happens to match, whereas
            the canonical label always resolves.

            has_expression_data lets the results table render unresolvable hits
            as plain text instead of links that 404: the DIAMOND database is
            built from peptide FASTAs that contain genes absent from the
            expression data, and for some species use a different ID namespace.
          */
          if (genes[i]) {
            const mapman_gas = genes[i].gene_annotations.filter(ga => ga.type === "MAPMAN")
            hit.names = mapman_gas.map(ga => ga.name)
            hit.resolved_label = genes[i].label
            hit.has_expression_data = true
          } else {
            hit.names = []
            hit.resolved_label = null
            hit.has_expression_data = false
          }
        })
        res.status(200).json(hits)
      } catch (error) {
        console.log(error)
        res.status(422).json({ error: "invalid query" })
      }
      break
    default:
      console.log("Method not available for this endpoint")
      res.status(405).json({error: "Method not available for this endpoint"})
  }
}
