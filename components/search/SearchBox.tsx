import React, { KeyboardEvent } from "react"
import debounce from "lodash.debounce"

import useOutsideAlerter from '../../components/hooks/useOutsideAlterer'
import useAutoFocus from "../hooks/useAutoFocus"

const SearchBox = ({
  initialValue, // for input field, usually blank
  placeholder, // for input field
  isLoadingResults =  false, // to know when the submit button should be disabled or not
  /*
   * `getSuggestions` is a callback from parent element
   *  returning an array of suggestions
   *  which contain the key `label`
   */
  getSuggestions,
  submitSearchQuery, // callback from parent to get and render results
  handleSelectRedirect,
}) => {
  /* Controlled input element */
  const [ userInput, setUserInput ] = React.useState(initialValue)

  /* List of suggestions and the selected index if any */
  const [ suggestions, setSuggestions ] = React.useState([])
  const [ selectedIndex, setSelectedIndex ] = React.useState(-1)  // First one by default

  /* Determines whether suggestions dropdown is shown or not */
  const [ suggestActive, setSuggestActive ] = React.useState(false)
  const [ isUpdatingSuggestions, setIsUpdatingSuggestions ] = React.useState(false)

  /* Disable button when query has been sent and is awaiting results */
  const [ buttonDisabled, setButtonDisabled ] = React.useState(isLoadingResults)

  /*
   * `formRef` to requestSubmit on it programatically
   * if the first load has non empty initial value
   * while retaining the userInput in the search box
   */
  const formRef = React.useRef(null)
  const [ isHydrated, setIsHydrated ] = React.useState(false)

  /* Autofocus on in the input field, passed as ref */
  const autoFocusRef = useAutoFocus()

  /* Ref used to identify clicks outside this div */
  const suggestionBoxRef = React.useRef(null)
  useOutsideAlerter(suggestionBoxRef, () => {setSuggestActive(false)})

  /*
   * Requests can resolve out of order (a fast response for an earlier,
   * now-stale keystroke can arrive after a slower response for the latest
   * one). Track a monotonically increasing request id and only apply the
   * response if it's still the most recent request fired.
   */
  const latestRequestIdRef = React.useRef(0)

  React.useEffect(() => {
    setButtonDisabled(isLoadingResults)
  }, [isLoadingResults])

  React.useEffect(() => {
    if (initialValue) {
      setUserInput(initialValue)
      setIsHydrated(true)
    }
  }, [initialValue])

  React.useEffect(() => {
    if (isHydrated && userInput) {
      formRef.current.requestSubmit()
    }
  }, [isHydrated])

  /*
   * If suggestions change, then update index to -1
   * meaning no suggestion is selected yet
   */
  React.useEffect(() => {
    setSelectedIndex(-1)
  }, [suggestions])

  const updateSuggestions = React.useCallback(
    debounce(async (query: string) => {
      const requestId = ++latestRequestIdRef.current
      setIsUpdatingSuggestions(true)
      const results = await getSuggestions(query)
      // Discard this response if a newer request has since been fired —
      // otherwise a slow response for an earlier keystroke can overwrite
      // the correct suggestions for what the user has typed since.
      if (requestId !== latestRequestIdRef.current) return
      setSuggestions(results)
      setIsUpdatingSuggestions(false)
    }, 500),
    [],
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    setButtonDisabled(true)
    submitSearchQuery(userInput)
    setSuggestActive(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    /* User pressed the enter key */
    if (event.key === "Enter") {
      event.preventDefault()
      if (selectedIndex == -1) {
        handleSubmit(event)
      }
      // If no suggestion selected, no need to update userInput
      // if no suggestion to select from, also no need to update userInput
      if (selectedIndex < 0 || suggestions.length < 0) return
      setUserInput(suggestions[selectedIndex].label)
      // Redirect to gene show page straight away not to the result page
      handleSelectRedirect(suggestions[selectedIndex]._id)
    }
    /* User pressed the up arrow */
    else if (event.key === "ArrowUp") {
      if (selectedIndex === -1) return
      // if selectedIndex === 0, can stil go up to unselect
      setSelectedIndex(selectedIndex - 1)
    }
    /* User pressed the down arrow */
    else if (event.key === "ArrowDown") {
      if (selectedIndex === suggestions.length - 1) return
      setSelectedIndex(selectedIndex + 1)
    }
  }

  return (
    <form action="#" onSubmit={handleSubmit} ref={formRef}>
      <div className="flex my-3">
        <div className="grow mr-3" ref={suggestionBoxRef}>
          <input
            type="search"
            ref={autoFocusRef}
            placeholder={placeholder}
            className="outline-none p-3 w-full rounded-full shadow border border-stone-300 focus:ring focus:ring-1 focus:ring-plb-green focus:border-plb-green"
            value={userInput}
            onChange={(e) => {
              /*
                Sync `value` with `userInput` component state
                Should not be called in debounced function because of timeout
                which cause state to be out of sync when typing
              */
              setUserInput(e.target.value)
              setSuggestActive(true)
              updateSuggestions(e.target.value)
            }}
            onKeyDown={handleKeyDown}
          />
          <div className="border bg-white my-1 mx-4 p-3" hidden={!suggestActive}>
            {/* Show status on suggestions */}
            {isUpdatingSuggestions && (suggestions.length === 0) && (
              <span className="text-stone-500">
                Checking suggestions ...
              </span>
            )}
            {!isUpdatingSuggestions && (suggestions.length === 0) && (
              <span className="text-stone-500">
                No suggestions found
              </span>
            )}
            {/* NOTE: Suggestions must return array of objects with a `label` key */}
            {suggestions.map((item, index) => (
              <div
                className={
                  `border-b last:border-0 py-1.5 hover:bg-slate-100
                  ${index === selectedIndex && "bg-plb-green/25"}`
                }
                key={item.label}
                data-gene-id={item._id}
                data-gene-label={item.label}
                onClick={(event) => {
                  event.preventDefault()
                  setUserInput(event.target.innerText)
                  setSuggestActive(false)
                  // Redirect to gene show page straight away not to the result page
                  handleSelectRedirect(event.target.dataset.geneId)
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>
        <div>
          <button
            type="submit"
            className="text-xl text-plb-light bg-plb-green hover:bg-plb-dark-green focus:outline-none focus:ring-4 focus:ring-green-300 rounded-full px-6 py-3 text-center disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={buttonDisabled}
          >
            Search
          </button>
        </div>
      </div>
    </form>
  )
}

export default SearchBox
