import { ObjectId } from "mongoose"

import Species from "../models/species"
import Gene from "../models/gene"
import connectMongo from "../utils/connectMongo"
import GeneAnnotation from "../models/geneAnnotation"

/* Collation used for all case-insensitive prefix searches below —
   must match the collation the label_ci / alias_label_ci indexes were built with */
const CASE_INSENSITIVE_COLLATION = { locale: "en", strength: 2 }

/*
  Build a MongoDB range filter for a case-insensitive PREFIX match on `field`,
  e.g. prefixFilter("label", "at5g4") matches any label starting with "at5g4"
  (any case). Must be combined with .collation(CASE_INSENSITIVE_COLLATION) on
  the query for the case-insensitivity to actually apply — that's what lets
  Mongo use the label_ci / alias_label_ci indexes via a real index seek
  instead of a full collection scan (unanchored/case-insensitive regex can't
  use an index at all: on the 6.3M-doc genes collection that was a 15-30s
  scan per keystroke).
*/
const prefixFilter = (field: string, term: string) => ({
  [field]: { $gte: term, $lt: term + "￿" },
})

interface GenesPageInputArgs {
  taxid: number
  pageIndex: number
  pageSize: number
  queryFilter?: string | null
  sortByObject?: object
}

/*
  Used for species show page, where the table of all genes for the species is at
 */
export const getGenesPage = async ({
  taxid,
  pageIndex = 0,
  pageSize = parseInt(process.env.pageSize!),
  queryFilter = "",
  sortByObject,
}: GenesPageInputArgs) => {
  connectMongo()
  const species = await Species.findOne({"tax": taxid}, "_id")
  const species_id = species._id
  /*
    We want to search for genes where queryFilter matches:
    - gene label
    - or the Mapman term name

    We also no longer care about sorting (for efficiency)
  */

  const geneAggregationResult = await Gene.aggregate([
    {
      "$match": { spe_id: species_id }
    },
    {
      "$lookup": {
        from: "gene_annotations",
        localField: "ga_ids",
        foreignField: "_id",
        as: "geneAnnotations",
      },
    },
    {
      "$set": {
        geneAnnotations: {
          "$filter": {
            input: "$geneAnnotations",
            as: "geneAnnotation",
            cond: {
              "$eq": ["$$geneAnnotation.type", "MAPMAN"]
            },
          }
        }
      }
    },
    {
      "$set": {
        mapmanNames: {
          "$map": {
            input: "$geneAnnotations",
            in: "$$this.name",
          }
        }
      }
    },
    {
      "$match": {
        "$or": [
          { label: { "$regex": new RegExp(queryFilter), "$options": "i" } },
          { "alias.label": { "$regex": new RegExp(queryFilter), "$options": "i" } },
          { mapmanNames: { "$regex": new RegExp(queryFilter), "$options": "i" } },
        ]
      }
    },
    {
      "$facet": {
        "metadata": [
          { "$count": "total" },
        ],
        "data": [
          { "$skip": pageIndex * pageSize },
          { "$limit": pageSize },
        ]
      }
    },
    {
      "$project": {
        metadata: {
          "$arrayElemAt": [ "$metadata", 0 ]
        },
        data: "$data"
      }
    },
  ])

  const numGenes = geneAggregationResult[0].metadata ? geneAggregationResult[0].metadata.total : 0
  const genes = geneAggregationResult[0].data
  /*
    NOTE: pageTotal is the number of pages required for the given pageSize,
    which is then needed by react-table's useTable() hook
  */
  const pageTotal = Math.ceil(numGenes / pageSize)
  return {
    // pageIndex: pageIndex,
    pageTotal: pageTotal,
    numGenes: numGenes,
    genes: genes,
  }
}

/*
  To return a single gene doc with its associated docs
  For gene show page
 */
export const getOneGene = async (
  species_id: ObjectId,
  label: string,
) => {
  connectMongo()
  const gene = await Gene.findOne({"spe_id": species_id, "$or": [{"label": label}, {"alias.label": label}]})
    .populate("gene_annotations")
    .populate({
      path: "neighbors.gene",
      select: "label ga_ids",
      populate: "mapman_annotations",
    })
  return gene
}

/*
  To return a single gene doc with its associated species
  For gene redirect by gene id
 */
export const getOneGeneById = async (
  id: ObjectId
) => {
  connectMongo()
  const gene = await Gene.findOne({ "_id": id })
    .populate("species")
    .lean()
  return gene
}

/*
  Returns a page of full gene docs
  Used for search results
 */
export const getGenesSearchPage = async (
  searchTerm: string,
  pageIndex: number = 0,
  pageSize: number = parseInt(process.env.pageSize),
) => {
  connectMongo()
  const searchFilter = {
    $or: [prefixFilter("label", searchTerm), prefixFilter("alias.label", searchTerm)],
  }
  const genes = await Gene.aggregate()
    .match(searchFilter)
    .skip(pageIndex * pageSize)
    .limit(pageSize)
    .lookup({
      from: "species",
      localField: "spe_id",
      foreignField: "_id",
      pipeline: [{
        $project: {_id: 0, tax: 1, name: 1}
      }],
      as: "species",
    })
    .unwind("species")
    .project({label: 1, alias: 1, species: 1})
    .collation(CASE_INSENSITIVE_COLLATION)
  const numGenes = await Gene.countDocuments(searchFilter).collation(CASE_INSENSITIVE_COLLATION)
  const pageTotal = Math.ceil(numGenes / pageSize)
  return {
    pageIndex: pageIndex,
    pageTotal: pageTotal,
    numGenes: numGenes,
    genes: genes,
  }
}


/*
  Returns just gene labels
  Used for search recommendations (i.e. the autocomplete dropdown — latency-sensitive,
  fires on every debounced keystroke)

  Runs the label-prefix and alias.label-prefix searches as two separate queries
  instead of a single $or, and merges the results here. This isn't just an
  optimization — it's a correctness-adjacent necessity: MongoDB's query planner
  doesn't push a two-sided ($gte/$lt) range bound into a *multikey* collation
  index (alias.label, since alias is an array) inside a compound $or the way it
  does for a plain scalar field. Measured via explain(): the combined $or was
  always falling back to a ~114k-document scan on the alias branch (0.9-1.5s)
  regardless of how narrow the prefix was, on top of whatever the label branch
  cost. Splitting them lets each query use its own tight index seek, and
  running them concurrently means total latency is bounded by the slower of
  the two (~1s) rather than their sum (~2.4s observed in production).
 */
export const getGeneLabelsSearchPage = async (
  searchTerm: string,
  pageIndex: number = 0,
  pageSize: number = parseInt(process.env.pageSize),
) => {
  connectMongo()
  const skip = pageIndex * pageSize
  const [byLabel, byAlias] = await Promise.all([
    Gene.find(prefixFilter("label", searchTerm), "label alias")
      .collation(CASE_INSENSITIVE_COLLATION)
      .skip(skip)
      .limit(pageSize),
    Gene.find(prefixFilter("alias.label", searchTerm), "label alias")
      .collation(CASE_INSENSITIVE_COLLATION)
      .skip(skip)
      .limit(pageSize),
  ])
  const seen = new Set(byLabel.map(g => g._id.toString()))
  const genes = byLabel.concat(byAlias.filter(g => !seen.has(g._id.toString())))
    .slice(0, pageSize)
  return { genes }
}


/*
  For protein seq search results
  From an array of taxid and gene label,
  return gene annotation names (filter for MAPMAN within the API call itself)
*/
export const getManyGenes = async (
  hits: {species_id: ObjectId, gene_label: string}[]
) => {
  connectMongo()
  const results = Promise.all(
    hits.map(async (hit) => {
      /*
        Match alias.label too: DIAMOND hits carry the identifier from the
        peptide FASTA, which for many species differs from the primary
        `label` (e.g. Brassica napus reports CDY… while Mongo stores
        GSBRNA2T…, with CDY… in `alias`). Matching on label alone returned
        null for those hits, so the caller silently rendered no MAPMAN
        annotations for them rather than the ones that do exist.
      */
      return await Gene.findOne({
        spe_id: hit.species_id,
        $or: [{ label: hit.gene_label }, { "alias.label": hit.gene_label }],
      })
        .populate("gene_annotations")
        .lean()
    })
  )
  return results
}
