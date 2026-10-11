import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/common/icon";
import { BRAND } from "@/lib/brand";

export function LandingNav({ signedIn }: { signedIn: boolean }) {
  return (
    <nav className="fixed inset-x-0 top-0 z-30 border-b border-zinc-900/80 bg-zinc-950/70 backdrop-blur" aria-label="Main">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
        <Link href="/" aria-label={`${BRAND.name} home`}>
          <Logo size={28} wordmark />
        </Link>
        <div className="hidden items-center gap-5 text-[13px] text-zinc-400 md:flex">
          <a href="/#demo" className="hover:text-zinc-100">Demo</a>
          <a href="/#how" className="hover:text-zinc-100">How it works</a>
          <a href="/#features" className="hover:text-zinc-100">Features</a>
          <a href="/#mcp" className="hover:text-zinc-100">MCP</a>
          <a href="/#templates" className="hover:text-zinc-100">Templates</a>
          <Link href="/contributors" className="hover:text-zinc-100">Contributors</Link>
          <a href="/#contribute" className="hover:text-zinc-100">Contribute</a>
        </div>
        <div className="flex-1" />
        <a href={BRAND.repo} className="hidden h-9 items-center gap-1.5 rounded-lg border border-zinc-800 px-3 text-[13px] text-zinc-300 hover:border-zinc-600 sm:flex" aria-label="Star md2slides on GitHub">
          <Icon name="github-logo" className="text-base" /> Star
        </a>
        <Link href="/app" className="flex h-9 items-center gap-1.5 rounded-lg bg-zinc-50 px-3.5 text-[13px] font-semibold text-zinc-950 hover:bg-zinc-200">
          {signedIn ? "Open app" : "Sign in"} <Icon name="arrow-right" />
        </Link>
      </div>
    </nav>
  );
}
