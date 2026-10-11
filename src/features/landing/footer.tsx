import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { BRAND } from "@/lib/brand";

export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 md:flex-row md:items-center">
        <div className="flex flex-col gap-2">
          <Logo size={24} wordmark />
          <p className="text-xs text-zinc-500">{BRAND.tagline}</p>
        </div>
        <div className="flex-1" />
        <div className="flex flex-wrap gap-5 text-[13px] text-zinc-400">
          <Link href="/app" className="hover:text-zinc-100">Open app</Link>
          <Link href="/contributors" className="hover:text-zinc-100">Contributors</Link>
          <a href="/llms-full.txt" className="hover:text-zinc-100">Syntax reference</a>
          <a href={`${BRAND.repo}/tree/main/packages/mcp`} className="hover:text-zinc-100">MCP server</a>
          <a href={`${BRAND.repo}/tree/main/vscode-extension`} className="hover:text-zinc-100">VS Code</a>
          <a href={`${BRAND.repo}/blob/main/CONTRIBUTING.md`} className="hover:text-zinc-100">Contribute</a>
          <a href={BRAND.support.sponsors} className="hover:text-zinc-100">Sponsor</a>
          <a href={BRAND.repo} className="hover:text-zinc-100">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
