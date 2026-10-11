/* eslint-disable @next/next/no-img-element -- GitHub avatars are already sized by the URL */
import { githubProfile } from "@/lib/github";
import { cn } from "@/lib/utils";

/** "by <avatar> Name" linking to the author's GitHub profile; plain text when there is no GitHub handle. */
export function AuthorCredit({
  name,
  github,
  size = 18,
  className,
  stopPropagation = false,
  onClick,
}: {
  name: string;
  github?: string;
  size?: number;
  className?: string;
  stopPropagation?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const p = githubProfile(github, size * 2);
  if (!p) return <span className={cn("truncate", className)}>{name}</span>;
  if (onClick) {
    return (
      <button
        type="button"
        title={`View @${github}’s profile`}
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          onClick(e);
        }}
        className={cn("inline-flex min-w-0 items-center gap-1.5 hover:text-zinc-100 cursor-pointer text-left", className)}
      >
        <img src={p.avatar} alt="" width={size} height={size} loading="lazy" className="shrink-0 rounded-full bg-zinc-800" />
        <span className="truncate">{name}</span>
      </button>
    );
  }
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`@${github} on GitHub`}
      onClick={(e) => stopPropagation && e.stopPropagation()}
      className={cn("inline-flex min-w-0 items-center gap-1.5 hover:text-zinc-100", className)}
    >
      <img src={p.avatar} alt="" width={size} height={size} loading="lazy" className="shrink-0 rounded-full bg-zinc-800" />
      <span className="truncate">{name}</span>
    </a>
  );
}
