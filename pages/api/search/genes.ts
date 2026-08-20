import type { NextApiRequest, NextApiResponse } from 'next'

import { getGenesSearchPage } from '../../../utils/genes'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  switch (req.method) {
    case "GET":
      try {
        const { searchTerm, pageIndex, pageSize } = req.query
        /*
          No regex escaping here: the search below is a $gte/$lt range query,
          not a regex. Escaping inserted literal backslashes into the term, so
          any identifier containing "." "_" "-" or "/" — which is most gene IDs
          — was searched for in a form that cannot match what is stored.
        */
        const parsedPageIndex = pageIndex ? parseInt(pageIndex) : 0
        const parsedPageSize = pageSize ? parseInt(pageSize) : process.env.pageSize

        const results = await getGenesSearchPage(searchTerm, parsedPageIndex, parsedPageSize)
        res.status(200).json(results)
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
