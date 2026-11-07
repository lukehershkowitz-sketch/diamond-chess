/** Shared text-field look: same height and radius as buttons, gold focus. */
export const fieldClass =
  "rounded-sm border border-line-strong bg-bg px-3 text-sm text-ink placeholder:text-muted outline-none transition-colors focus:border-accent disabled:opacity-50";

/** Segmented control (tabs): one track, the selected segment raised. */
export const segTrack = "flex gap-1 rounded-sm bg-bg p-1 text-sm";
export const segItem = (selected: boolean) =>
  `flex-1 rounded-[6px] px-3 py-1.5 font-medium transition-colors ${selected ? "bg-raised-2 text-ink" : "text-muted hover:text-ink"}`;
