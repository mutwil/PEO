import { Schema, model, models, ObjectId } from "mongoose"

import GeneAnnotation from "./geneAnnotation"
import Species from "./species"

const neighborSchema = new Schema({
  gene: {
    type: ObjectId,
    ref: "Gene",
  },
  pcc: Number,
});

const aliasSchema = new Schema({
  label:  { type: String,  required: true },
  pident: { type: Number,  required: true },
  evalue: { type: Number,  required: true },
}, { _id: false })

const geneSchema = new Schema({
  label: {
    type: String,
    required: true,
  },
  alias: {
    type: [aliasSchema],
    required: true,
    default: [],
  },
  spe_id: {
    type: ObjectId,
    required: true,
  },
  ga_ids: {
    type: [ObjectId],
    required: true,
    default: [],
    ref: "GeneAnnotation", // run .populate("ga_ids") to get objects
  },
  neighbors: {
    type: [neighborSchema],
  }
})

geneSchema.virtual("species", {
  ref: "Species",
  localField: "spe_id",
  foreignField: "_id",
  justOne: true,
})

geneSchema.virtual("gene_annotations", {
  ref: "GeneAnnotation",
  localField: "ga_ids",
  foreignField: "_id",
})

geneSchema.virtual("mapman_annotations", {
  ref: "GeneAnnotation",
  localField: "ga_ids",
  foreignField: "_id",
  match: { type: "MAPMAN" },
})

/* These are needed for virtual fields to appear */
geneSchema.set("toObject", { virtuals: true })
geneSchema.set("toJSON", { virtuals: true })

const Gene = models.Gene || model("Gene", geneSchema, "genes")

export default Gene
