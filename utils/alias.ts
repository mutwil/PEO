/*
  Gene aliases come from two different kinds of source, and they need to be
  presented differently.

    BLAST-derived   reciprocal-best-hit matches against another annotation
                    (Eugene's gene-aliases/taxid*_aliases.tsv). These carry a
                    real percent identity and e-value, which are meaningful:
                    the alias is a *similar* sequence, not the same gene.

    Identifier      alternative identifiers for the very same record — the gene
                    ID stated in the peptide FASTA header, an NCBI accession
                    embedded in the label, a peptide ID from the ID map. These
                    are stored with pident/evalue 0 because no alignment was
                    involved; there is nothing to report.

  Rendering the stored zeros for the second kind produced
  "(pident: 0%, e-value: 0.0e+0)", which reads as a failed match rather than an
  exact synonym. So only show the statistics when an alignment actually
  produced them.
*/
export interface GeneAlias {
  label: string
  pident?: number
  evalue?: number
  source?: string
}

export const isBlastDerivedAlias = (a: GeneAlias): boolean =>
  typeof a?.pident === "number" && a.pident > 0

/*
  Returns the " (pident: 99.3%, e-value: 0.0e+0)" suffix, or "" for identifier
  aliases. Tolerates a missing evalue rather than throwing — an alias without
  one should degrade to just the label, not take the whole page down.
*/
export const aliasStatsSuffix = (a: GeneAlias): string => {
  if (!isBlastDerivedAlias(a)) return ""
  const ev = typeof a.evalue === "number" ? a.evalue.toExponential(1) : "n/a"
  return ` (pident: ${a.pident}%, e-value: ${ev})`
}
