import { useContext, useMemo } from "react"

import LocalPaginatedTable from "./generics/LocalPaginatedTable"
import TextLink from "../atomic/TextLink"
import ShowMoreList from "../atomic/texts/ShowMoreList"
import { useRouter } from "next/router"
import { GlobalStoreContext } from "../../pages/_app"

const InterproShowTable = ({ data }) => {

  const router = useRouter();
  const { setNavigationPayload } = useContext(GlobalStoreContext);

  const columns = useMemo(
    () => [
      {
        Header: "Species",
        accessor: "species.name",
        Cell: ({ value, row }) => (
          <TextLink href={`/species/${row.original.species.tax}`}>
            {value}
          </TextLink>
        ),
      },
      {
        Header: "Genes",
        accessor: "genes",
        Cell: ({ value, row }) => (
          <ShowMoreList
            items={value.map((gene, i) => (
              <TextLink
                href={`/species/${row.original.species.tax}/genes/${gene.label}`}
                key={i}
              >
                {gene.label}
              </TextLink>
            ))}
          />
        ),
      },
      {
        Header: "Heatmap",
        Cell: ({ value, row }) => (
          <TextLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              const taxid = row.original.species.tax;
              const geneLabels = row.values.genes.map((gene) => gene.label);
              const payload = geneLabels.map((label) => ({ taxid, label }));
              setNavigationPayload(payload);
              router.push("/heatmap");
            }}
          >
            Go to heatmap
          </TextLink>
        ),
      },
    ],
    []
  );

  return (
    <LocalPaginatedTable
      columns={columns}
      data={data}
      hiddenColumns={[]}
    />
  )
}

export default InterproShowTable
