import { FaDiscord, FaLinkedin, FaGithub } from "react-icons/fa";
import { SiX } from "react-icons/si";

/**
 * Displayed at the bottom of every page with links Tide socials
 */
export default function Footer(){
    return (
        <footer className="mt-auto flex flex-col items-center justify-between gap-3 border-t border-[#1f1f1f] px-6 py-4 text-xs text-neutral-500 md:flex-row">
        <div className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-4">
          <p>Sealed Tender - built on TideCloak for RMIT Hackathon 2026. All companies and bids are fictional.</p>
          <p>
            Secured by{" "}
            <a href="https://tide.org/tidecloak_product" className="underline hover:text-neutral-300" target="_blank">TideCloak</a>
          </p>
          <a href="https://tide.org/alpha" className="hover:text-neutral-300" target="_blank">
            Join the Alpha program
          </a>
        </div>
        <div className="flex gap-4 text-base">
          <a href="https://discord.gg/XBMd9ny2q5" aria-label="Discord" className="transition hover:text-neutral-300" target="_blank"><FaDiscord /></a>
          <a href="https://twitter.com/tidefoundation" aria-label="X (formerly Twitter)" className="transition hover:text-neutral-300" target="_blank"><SiX /></a>
          <a href="https://www.linkedin.com/company/tide-foundation/" aria-label="LinkedIn" className="transition hover:text-neutral-300" target="_blank"><FaLinkedin /></a>
          <a href="https://github.com/tide-foundation/" aria-label="GitHub" className="transition hover:text-neutral-300" target="_blank"><FaGithub /></a>
        </div>
      </footer>
    )
}
