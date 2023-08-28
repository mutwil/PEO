import type { AppProps } from 'next/app'
import { createContext, useEffect, useState } from 'react';
import 'regenerator-runtime/runtime'

import NextNProgress from 'nextjs-progressbar'
import '../styles/globals.css'

// Fontawesome setup for Next.js
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { GeneUnit } from './api/heatmap';
config.autoAddCss = false

export const GlobalStoreContext = createContext({});

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    import("flowbite/dist/flowbite.js")
  }, [])

  const [ navigationPayload, setNavigationPayload ] = useState<GeneUnit[]>();

  return (
    <GlobalStoreContext.Provider value={{ navigationPayload, setNavigationPayload }}>
      <NextNProgress height={5} color="#D87F61" />
      <Component {...pageProps} />
    </GlobalStoreContext.Provider>
  )
}

export default MyApp
