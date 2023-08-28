import { median } from "mathjs"
import { ObjectId } from "mongoose"
// import { Types } from "mongoose"
// const ObjectId = Types.ObjectId

import Species from "../models/species"
import Gene from "../models/gene"
import SampleAnnotation from "../models/sampleAnnotation"
import connectMongo from "../utils/connectMongo"
import { getStdDev, getWhiskers } from "./stats"

import * as poNameMap from '/public/data/po_name_map.json' assert {type: 'json'}

export const getSampleAnnotations = async (
  taxid: number,
  geneLabel: string,
  type: string = "PO",
  projection?: string[],
) => {
  connectMongo()
  const species = await Species.findOne({ "tax": taxid }, "_id")
  const gene = await Gene.findOne(
    { "spe_id": species._id, "label": geneLabel },
    "_id"
  )
  const sas = await SampleAnnotation.find({
    "spe_id": species._id,
    "g_id": gene._id,
    "type": type,
  }, projection).lean()
  return sas
}

/*
  For a gene for a particular species,
  get the Sample Annotation doc with the highest SPM
*/
export const getHighestSpmSA = async (
  taxid: number,
  geneLabel: string,
) => {
  const sas = await getSampleAnnotations(taxid, geneLabel)
  let highestSpm = null
  if (sas.length > 0) {
    highestSpm = sas.reduce(
      (prev, curr) => prev.spm > curr.spm ? prev : curr
    )
    highestSpm.labelName = poNameMap[highestSpm.label]
  }
  return highestSpm
}

/*
  Avoid calling the DB a second time
*/
interface SortableSA {
  spm: number
  spm_med: number
}

export const findTopSpmSA = (
  sampleAnnotations: SortableSA[],
  n: number = 3,
  by: "mean" | "median" = "mean",
): SortableSA[] => {
  if (by === "mean") {
    return [...sampleAnnotations].sort((sa1, sa2) => sa2.spm - sa1.spm).slice(0, n)
  }
  return [...sampleAnnotations].sort((sa1, sa2) => sa2.spm_med - sa1.spm_med).slice(0, n)
}

/*
  For getting additional data to be rendered on graphs
*/
export const getSampleAnnotationsGraphData = async (
  taxid: number,
  geneLabel: string,
  type: string = "PO",
) => {
  const sampleAnnotations = await getSampleAnnotations(taxid, geneLabel, type)
  sampleAnnotations.forEach(sa => {
    sa.name = poNameMap[sa.label]
    sa.tpms = sa.samples.map((sample: object): number => sample.tpm)
    sa.sampleLabels = sa.samples.map((sample: object): string => sample.label)
    sa.sd = getStdDev(sa.tpms)
    // sa.se = 0
    sa.median = Math.round(median(sa.tpms) * 1000) / 1000
    sa.topWhisker = getWhiskers(sa.tpms)[1]
    delete sa.samples
  })
  return sampleAnnotations
}

/*
  For getting most specific genes for a SA (organ)
*/
interface organSpecificSasInputArgs {
  poLabel: string
  speciesId?: ObjectId | null
  pageIndex?: number
  pageSize?: number
  queryFilter?: string | null
  sortByObject?: object
}

export const getOrganSpecificSasByMedian = async ({
  poLabel,
  speciesId = null,
  pageIndex = 0,
  pageSize = parseInt(process.env.pageSize!),
  queryFilter = null,
  sortByObject,
}: organSpecificSasInputArgs) => {
  connectMongo()

  const pipeline = [
    {
      // Index created by these fields, in this order
      "$match": {
        type: "PO",
        label: poLabel,
        spe_id: speciesId,
      }
    },
    {
      "$sort": { spm_med: -1 }
    },
    {
      // Then use another index to filter by spm
      "$match": {
        med_tpm: { "$gt": 1 },
      }
    },
    {
      "$facet": {
        "metadata": [
          { "$count": "total" }
        ],
        "data": [
          {
            "$skip": pageIndex * pageSize,
          },
          {
            "$limit": pageSize,
          },
          {
            "$lookup": {
              from: "species",
              localField: "spe_id",
              foreignField: "_id",
              as: "species",
            }
          },
          {
            "$set": {
              species: {
                "$arrayElemAt": ["$species", 0]
              }
            }
          },
          {
            "$lookup": {
              from: "genes",
              localField: "g_id",
              foreignField: "_id",
              as: "gene",
            }
          },
          {
            "$set": {
              gene: {
                "$arrayElemAt": ["$gene", 0]
              }
            }
          },
          {
            "$unset": "gene.neighbors"
          },
          {
            "$lookup": {
              from: "gene_annotations",
              localField: "gene.ga_ids",
              foreignField: "_id",
              as: "geneAnnotations",
            }
          },
          {
            "$set": {
              mapman_annotations: {
                "$filter": {
                  input: "$geneAnnotations",
                  as: "geneAnnotation",
                  cond: {
                    "$eq": ["$$geneAnnotation.type", "MAPMAN"]
                  }
                }
              }
            }
          },
          {
            "$unset": "geneAnnotations"
          },
        ]
      },
    },
    {
      "$project": {
        metadata: {
          "$arrayElemAt": [ "$metadata", 0 ]
        },
        data: "$data"
      }
    },
  ]

  const aggregationResult = await SampleAnnotation.aggregate(pipeline)
  const sas = aggregationResult[0].data
  const numSasTotal = aggregationResult[0].metadata ? aggregationResult[0].metadata.total : 0
  const numSasPassed = Math.ceil(numSasTotal * 0.05)
  const pageTotal = Math.ceil(0.05 * numSasTotal / pageSize)

  return {
    numSasTotal,
    pageTotal,
    pageIndex,
    sas: (pageIndex < pageTotal) ? sas : [],
  }
}


export const getOrganSpecificSasByMean = async ({
  poLabel,
  speciesId = null,
  pageIndex = 0,
  pageSize = parseInt(process.env.pageSize!),
  queryFilter = null,
  sortByObject,
}: organSpecificSasInputArgs) => {
  connectMongo()

  const pipeline = [
    {
      // Index created by these fields, in this order
      "$match": {
        type: "PO",
        label: poLabel,
        spe_id: speciesId,
      }
    },
    {
      "$sort": { spm: -1 }
    },
    {
      // Then use another index to filter by spm
      "$match": {
        avg_tpm: { "$gt": 1 },
      }
    },
    {
      "$facet": {
        "metadata": [
          { "$count": "total" }
        ],
        "data": [
          {
            "$skip": pageIndex * pageSize,
          },
          {
            "$limit": pageSize,
          },
          {
            "$lookup": {
              from: "species",
              localField: "spe_id",
              foreignField: "_id",
              as: "species",
            }
          },
          {
            "$set": {
              species: {
                "$arrayElemAt": ["$species", 0]
              }
            }
          },
          {
            "$lookup": {
              from: "genes",
              localField: "g_id",
              foreignField: "_id",
              as: "gene",
            }
          },
          {
            "$set": {
              gene: {
                "$arrayElemAt": ["$gene", 0]
              }
            }
          },
          {
            "$unset": "gene.neighbors"
          },
          {
            "$lookup": {
              from: "gene_annotations",
              localField: "gene.ga_ids",
              foreignField: "_id",
              as: "geneAnnotations",
            }
          },
          {
            "$set": {
              mapman_annotations: {
                "$filter": {
                  input: "$geneAnnotations",
                  as: "geneAnnotation",
                  cond: {
                    "$eq": ["$$geneAnnotation.type", "MAPMAN"]
                  }
                }
              }
            }
          },
          {
            "$unset": "geneAnnotations"
          },
        ]
      },
    },
    {
      "$project": {
        metadata: {
          "$arrayElemAt": [ "$metadata", 0 ]
        },
        data: "$data"
      }
    },
  ]

  const aggregationResult = await SampleAnnotation.aggregate(pipeline)
  const sas = aggregationResult[0].data
  const numSasTotal = aggregationResult[0].metadata ? aggregationResult[0].metadata.total : 0
  const numSasPassed = Math.ceil(numSasTotal * 0.05)
  const pageTotal = Math.ceil(0.05 * numSasTotal / pageSize)

  return {
    numSasTotal,
    pageTotal,
    pageIndex,
    sas: (pageIndex < pageTotal) ? sas : [],
  }
}
