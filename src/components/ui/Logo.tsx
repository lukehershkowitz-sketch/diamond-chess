/**
 * Diamond Chess mark: a faceted gem whose crown reads as a crown of a chess piece.
 * Drawn on a 32px grid; the same paths make up app/icon.svg.
 */
export function LogoMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={className}>
      {/* pavilion (lower facets) */}
      <path d="M3 12 L16 29 L29 12 Z" fill="#a8843f" />
      <path d="M10.5 12 L16 29 L21.5 12 Z" fill="#c9a45a" />
      {/* crown (upper facets) */}
      <path d="M8 4 L24 4 L29 12 L3 12 Z" fill="#e3c27e" />
      <path d="M12 4 L20 4 L21.5 12 L10.5 12 Z" fill="#f1d89f" />
      {/* girdle highlight */}
      <path d="M3 12 H29" stroke="#0c0a08" strokeOpacity=".35" strokeWidth="1" />
    </svg>
  );
}

/** Mark plus wordmark; `compact` hides the wordmark on phones where the nav needs the room. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={26} />
      <span className={`text-[17px] font-semibold tracking-[-0.03em] text-ink ${compact ? "hidden sm:inline" : ""}`}>
        Diamond <span className="text-accent">Chess</span>
      </span>
    </span>
  );
}
