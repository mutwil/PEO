import { ObjectId } from "mongoose"

import Species from "../models/species"
import Gene from "../models/gene"
import connectMongo from "../utils/connectMongo"
import GeneAnnotation from "../models/geneAnnotation"

/* Collation used for all case-insensitive prefix searches below —
   must match the collation the label_ci / alias_label_ci indexes were built with */
export const CASE_INSENSITIVE_COLLATION = { locale: "en", strength: 2 }

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

/*
  The same prefix range, but for a field inside an ARRAY (alias[]), where it
  must be wrapped in $elemMatch.

  Without $elemMatch, MongoDB applies each bound independently across the whole
  array: a document matches if SOME element is >= the lower bound and SOME
  element is < the upper bound — not necessarily the same element. So a Medicago
  gene whose aliases are ["AES58637", "KEH39708"] matched a search for
  "BRADI_41430s00200", because "AES…" sorts below the upper bound and "KEH…"
  above the lower one, even though neither remotely starts with "BRADI".

  Measured on the live database, that prefix returned 2,517 documents of which
  6 were real — 99.8% false positives. $elemMatch forces both bounds onto a
  single element, and still uses the alias_label_ci index (IXSCAN, 6 keys
  examined), so it is also faster.
*/
const arrayPrefixFilter = (arrayField: string, subField: string, term: string) => ({
  [arrayField]: { $elemMatch: { [subField]: { $gte: term, $lt: term + "￿" } } },
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
  Identifiers coming from protein (DIAMOND) search are the sequence IDs from
  the 147_pep/ peptide FASTAs, which differ from the stored gene label in two
  stacking ways:

    1. CASE. The uploader uppercases every gene label (GeneBase.upcase_label),
       so the DB holds SEITA.1G000100 while the peptide FASTA says
       Seita.9G115300.1.p. Mongo string matching is case-sensitive, so these
       never matched.
    2. ISOFORM/TRANSCRIPT SUFFIXES, often stacked — Seita.9G115300.1.p needs
       both `.p` and `.1` removed, so stripping must repeat until stable.

  Measured over all 5,102,524 peptide IDs against the live database:
      1,133,770 (22%) matched as-is
      2,160,711 (42%) matched ONLY after uppercasing
      1,306,913 (26%) matched ONLY after also stripping suffixes
         47,465  (1%) matched only via alias
        453,665  (9%) genuinely absent (different ID namespace / no expression
                      record) — those cannot be recovered by normalisation and
                      need the DIAMOND DB rebuilt with matching IDs.

  So normalising recovers ~91% of peptide IDs; without it only ~22% resolve.
*/
export const normaliseGeneLabel = (label: string): string => label.toUpperCase()

const SUFFIX_RE = /\.(?:cds\d+|t\d+|mrna\d*|p|\d+)$/i

/*
  Every progressively-stripped form, longest first — NOT just the fully
  stripped one. Which level is correct varies by species and cannot be
  guessed from the identifier alone:

    Arabidopsis halleri  g02634.t1.cds1      -> DB has G02634.T1   (one level)
    Camelina sativa      Csa19g001420.1.cds1 -> DB has CSA19G001420.1
    Setaria italica      Seita.9G115300.1.p  -> DB has SEITA.9G115300 (two levels)
    Ananas comosus       Aco002306.1.mrna1   -> DB keeps the whole thing

  Returning only the fully-stripped form silently missed the intermediate
  matches (7 of 50 hits in a sample protein search).
*/
export const strippedForms = (label: string): string[] => {
  const forms: string[] = []
  let cur = label
  while (true) {
    const next = cur.replace(SUFFIX_RE, "")
    if (next === cur || next.length === 0) break
    forms.push(next)
    cur = next
  }
  return forms
}

/*
  Candidate lookup forms for a user- or DIAMOND-supplied identifier, most
  specific first, de-duplicated so callers don't run the same query twice.
  Order matters: the un-stripped uppercase form must be tried before any
  stripped form, because some species legitimately keep the suffix in the
  stored label.

  Pipe handling: the DIAMOND reference now stores the full whitespace-delimited
  header token, so an identifier may legitimately contain '|'. Which part is the
  gene ID depends on the species, so try both:
    Cyanophora  Cpa|evm.model.tig00000017.1        -> whole thing is the ID
    Selaginella 402070|PACid:15401278              -> whole thing (maps via alias)
    Cicer       Ca_00001.1|Ca_LG_1:6359-6790|plus| -> only the prefix is the ID
  Previously the DIAMOND build split on '|' itself, which silently truncated
  Cyanophora's 24,702 sequences to the single ID "Cpa".
*/
export const geneLabelCandidates = (label: string): string[] => {
  const upper = normaliseGeneLabel(label)
  const pipePrefix = label.includes("|") ? label.split("|")[0] : null
  const pipePrefixUpper = pipePrefix ? normaliseGeneLabel(pipePrefix) : null
  const ordered = [
    label,
    upper,
    ...strippedForms(upper),
    ...strippedForms(label),
    ...(pipePrefix ? [pipePrefix, pipePrefixUpper as string,
                      ...strippedForms(pipePrefixUpper as string)] : []),
  ]
  return ordered.filter((v, i) => v.length > 0 && ordered.indexOf(v) === i)
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
    /*
      Collation is required here, not optional. Without it the planner cannot
      use label_ci / alias_label_ci (both carry an en/strength-2 collation), so
      it falls back to IXSCAN {spe_id:1,label:1} with an unbounded label range
      and post-filters. Measured on the live slow-query log: 58,605 slow queries
      took that plan, examining 2,317,203,014 documents to return 128,191 --
      18,076 documents read per document returned, worst case a COLLSCAN of all
      6,335,869 genes taking 217 seconds to return one. Every miss pays that cost
      once per candidate in geneLabelCandidates(), up to seven times per lookup.
      Safe to add: the uploader uppercases every label (zero genes contain a
      lowercase character) and no species has two labels differing only by case,
      so strength-2 cannot merge two distinct genes.
    */
  const query = (l: string) => Gene.findOne({"spe_id": species_id, "$or": [{"label": l}, {"alias.label": l}]})
    .collation(CASE_INSENSITIVE_COLLATION)
    .populate("gene_annotations")
    .populate({
      path: "neighbors.gene",
      select: "label ga_ids",
      populate: "mapman_annotations",
    })

  for (const candidate of geneLabelCandidates(label)) {
    const gene = await query(candidate)
    if (gene) return gene
  }
  return null
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
    $or: [
      prefixFilter("label", searchTerm),
      arrayPrefixFilter("alias", "label", searchTerm),
    ],
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
    Gene.find(arrayPrefixFilter("alias", "label", searchTerm), "label alias")
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
      /* collation: see the note in getOneGene -- same index, same cost */
      const find = (l: string) => Gene.findOne({
        spe_id: hit.species_id,
        $or: [{ label: l }, { "alias.label": l }],
      })
        .collation(CASE_INSENSITIVE_COLLATION)
        .populate("gene_annotations")
        .lean()

      for (const candidate of geneLabelCandidates(hit.gene_label)) {
        const gene = await find(candidate)
        if (gene) return gene
      }
      return null
    })
  )
  return results
}
