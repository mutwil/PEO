import { NextApiRequest, NextApiResponse } from "next";
import { getSampleAnnotations } from "../../../utils/sampleAnnotations";

export enum Metric {
  AVG_TPM = "avg_tpm",
  MED_TPM = "med_tpm",
  SPM = "spm",
  SPM_MED = "spm_med",
}

export interface GeneUnit {
  taxid: number;
  label: string;
}

export interface PostPayload {
  genes: GeneUnit[];
  metric?: Metric;
}

export interface AnnotationMap {
  [key: string]: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    /**
     * Non-standard POST request, to pass potentially large body as parameter
     */
    case "POST":
      try {
        const payload: PostPayload = {
          genes: req.body.genes || [],
          metric: Object.values(Metric).includes(req.body.metric as Metric)
            ? req.body.metric
            : Metric.AVG_TPM,
        }
        const projection = ["_id", "label", payload.metric as string];
        const annotationMaps: AnnotationMap[] = await Promise.all(
          payload.genes.map(async gene => {
            const result = await getSampleAnnotations(gene.taxid, gene.label, "PO", projection)
            return result.reduce((acc, curr) => {
              acc[curr.label] = curr[payload.metric as string];
              return acc;
            }, {});
          })
        );
        res.status(200).json(annotationMaps);
      } catch (error) {
        console.log(error);
        res.status(422).json({ error: `invalid query` });
      }
      break;

    default:
      console.log("Method not available for this endpoint");
      res.status(405).json({ error: "Method not available for this endpoint" });
  }
}
