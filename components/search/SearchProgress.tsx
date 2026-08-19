import React from "react"

/*
  Progress indicator for long-running protein searches.

  A DIAMOND search against the ~5.1M-sequence PEO database takes roughly
  25-60s (occasionally longer for low-complexity sequences, which generate
  far more seed hits). That is long enough that a static "Searching ..."
  line reads as a frozen page, so this shows a live elapsed counter, an
  animated bar, and staged status text so it's obvious work is happening.

  The bar is deliberately *estimate-based*, not real progress: DIAMOND does
  not stream progress back, so there is nothing truthful to report
  proportionally. It asymptotically approaches ~90% over the expected
  duration and never claims to be finished until results actually arrive —
  so it never shows a full bar while still waiting.
*/

interface IProps {
  /** Typical completion time in seconds, used to pace the estimated bar. */
  expectedSeconds?: number
}

const SearchProgress: React.FC<IProps> = ({ expectedSeconds = 30 }) => {
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    const started = Date.now()
    const id = setInterval(() => {
      setElapsed((Date.now() - started) / 1000)
    }, 250)
    return () => clearInterval(id)
  }, [])

  /*
    Asymptotic curve: fast at first, then slows, approaching but never
    reaching 90%. Avoids the "stuck at 100%" problem when a search runs
    longer than expected.
  */
  const pct = Math.min(90, 90 * (1 - Math.exp(-elapsed / (expectedSeconds * 0.6))))

  let stage = "Submitting sequence …"
  if (elapsed > 2) stage = "Searching 5.1 million protein sequences across 147 species …"
  if (elapsed > expectedSeconds * 1.5) stage = "Still working — low-complexity sequences can take longer …"
  if (elapsed > 120) stage = "This is taking unusually long, but the search is still running …"

  return (
    <div className="my-6" role="status" aria-live="polite">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-plb-green font-medium">{stage}</p>
        <p className="text-sm text-stone-500 tabular-nums">{elapsed.toFixed(0)}s elapsed</p>
      </div>

      <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-plb-green h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-sm text-stone-500 mt-2">
        Protein similarity searches typically take <strong>25–60 seconds</strong>. Please keep this tab open.
      </p>
    </div>
  )
}

export default SearchProgress
