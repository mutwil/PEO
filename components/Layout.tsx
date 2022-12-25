import Head from "next/head"
import Link from "next/link"
import Image from 'next/image'

import TextLink from "./atomic/TextLink";

export default function Layout({ children }) {
  return (
    <div className="flex flex-col items-stretch min-w-min min-h-screen font-ttinterfaces tracking-wide bg-stone-100">
      <Head>
        <title>Plant Gene Expression Omnibus</title>
        <meta
          name="description"
          content="A kingdom-wide resource for plant gene expression across organs"
        />
        {/* <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" /> */}
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="sticky top-0 z-20">
        {/*
          TOFIX:
          mobile hamburger doesnt work on routing to other pages
          flowbite issue with chrome browsers, not urgent for now, to be fixed next time
        */}
        <nav className="bg-plb-green py-4 pl-4 pr-2 md:px-6">
          <div className="container flex flex-wrap justify-between items-center mx-auto">
            <TextLink href="/" className="self-center whitespace-nowrap text-gray-50 text-xl font-medium">
              Omnibus
            </TextLink>
            <button data-collapse-toggle="navbar-default" type="button" className="md:hidden inline-flex items-center p-2 ml-3 text-sm text-gray-50 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-200" aria-controls="navbar-default" aria-expanded="false">
              <span className="sr-only">Open main menu</span>
              <svg className="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path></svg>
            </button>
            <div className="hidden w-full md:block md:w-auto" id="navbar-default">
              <ul className="flex flex-col md:flex-row bg-gray-50 md:bg-transparent rounded-xl border border-gray-200 md:border-0 md:space-x-6 py-0 mt-2 md:mt-0">
                {[
                  ["Species", "/species"],
                  ["Organs", "/organs"],
                  ["PFAM", "/interpro"],
                  ["Mapman", "/mapman"],
                  ["Help", "/help"] 
                ].map(([title, url]) => (
                  <li key={title} className="hover:bg-gray-200 first:hover:rounded-t-xl last:hover:rounded-b-xl md:hover:bg-inherit">
                    <TextLink
                      href={url}
                      className="block py-2 px-3 md:p-0 text-gray-700 md:text-gray-50 hover:font-medium md:hover:font-normal hover:no-underline md:hover:underline"
                    >
                      {title}
                    </TextLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
        {/* <nav className="sticky w-full bg-plb-green text-white shadow-sm shadow-slate-200">
          <div className="flex flex-row items-end py-4">
            <Link href="/">
              <a className="grow text-2xl font-medium hover:underline active:text-black ml-6 mr-3">
                Omnibus
              </a>
            </Link>
            {[
              ["Species", "/species"],
              ["Organs", "/organs"],
              ["PFAM", "/interpro"],
              ["Mapman", "/mapman"],
            ].map(([title, url]) => (
              <Link href={url} key={title}>
                <a className="text-lg mx-3 last:mr-8 hover:underline active:text-blue-800">
                  {title}
                </a>
              </Link>
            ))}
          </div>
        </nav> */}
      </header>

      <main className="container mx-auto py-4 px-8">{children}</main>

      <footer className="mt-auto">
        <div className="text-center px-8 my-3">
          <a
            href="https://plant.tools"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Mutwil Lab
          </a>{" "}
          🌱 , NTU Singapore
        </div>
        <div className="bg-amber-300/50 text-center px-3 py-3">
          <p className="text-sm">
            🚧👷🏻 We are in alpha testing.{" "}
            <TextLink href="https://forms.gle/AbVGtaGe8CxtmR8q9" target="_blank">
              Give your feedback
            </TextLink>.
          </p>
        </div>
      </footer>
    </div>
  );
}
