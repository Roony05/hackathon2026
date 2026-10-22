import {
    FaDiscord,
    FaLinkedin,
    FaGithub,
    FaExclamationCircle,
} from "react-icons/fa";

import { SiX } from "react-icons/si";

/**
 * Displayed at the bottom of every page with links Tide socials
 */
export default function Footer(){
    return (
        <footer className="mt-auto border-t border-white/10 bg-white/5 backdrop-blur-xl text-slate-400 px-6 py-5 flex flex-col md:flex-row justify-between items-center text-sm gap-2 md:gap-0">

        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
          <p className="font-medium">
            Sealed Tender - built on TideCloak for RMIT Hackathon 2026. All companies and bids are fictional.
          </p>
          <p>
            Secured by{" "}
            <a href="https://tide.org/tidecloak_product" className="text-blue-600 underline" target="_blank">TideCloak</a>
          </p>
          <a
            href="https://tide.org/alpha"
            className="px-3 py-1 rounded-full border border-white/20 bg-white/5 text-slate-200 hover:border-amber-300/60 hover:text-amber-200 transition"
            target="_blank"
          >
            Join the Alpha program
          </a>
        </div>
        <div className="flex gap-4 text-xl">
          <a
            href="https://discord.gg/XBMd9ny2q5"
            aria-label="Discord"
            className="hover:text-blue-500 transition"
            target="_blank"
          >
            <FaDiscord />
          </a>
          <a
            href="https://twitter.com/tidefoundation"
            aria-label="X (formerly Twitter)"
            className="hover:text-blue-500 transition"
            target="_blank"
          >
            <SiX />
          </a>
          <a
            href="https://www.linkedin.com/company/tide-foundation/"
            aria-label="LinkedIn"
            className="hover:text-blue-500 transition"
            target="_blank"
          >
            <FaLinkedin />
          </a>
          <a
            href="https://github.com/tide-foundation/"
            aria-label="GitHub"
            className="hover:text-blue-500 transition"
            target="_blank"
          >
            <FaGithub />
          </a>
        </div>
      </footer>
    )
}