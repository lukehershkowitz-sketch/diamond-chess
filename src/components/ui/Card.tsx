import type { HTMLAttributes, ReactNode } from "react";

/**
 * The one card: surface fill, hairline border, 12px radius. `flush` drops the padding for cards
 * that hold their own rows (lists, chat); `title` adds the standard header row.
 */
export function Card({
  title,
  aside,
  flush = false,
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { title?: ReactNode; aside?: ReactNode; flush?: boolean }) {
  return (
    <div className={`rounded-md border border-line bg-surface ${className}`} {...rest}>
      {title !== undefined && (
        <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold tracking-normal text-ink">{title}</h2>
          {aside && <div className="min-w-0 truncate text-xs text-muted">{aside}</div>}
        </div>
      )}
      <div className={flush ? "" : "p-4"}>{children}</div>
    </div>
  );
}

/** Small uppercase label used above groups inside a card. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`text-xs font-medium uppercase tracking-wider text-muted ${className}`}>{children}</div>;
}
