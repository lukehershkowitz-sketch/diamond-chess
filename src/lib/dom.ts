/**
 * Scrolls `container` just enough to show `el`, without scrolling the page or any other ancestor.
 * (Element.scrollIntoView scrolls every scrollable ancestor, including the window, which
 * yanks the board off screen when stepping through moves.)
 */
export function revealWithin(container: HTMLElement, el: HTMLElement) {
  const c = container.getBoundingClientRect();
  const e = el.getBoundingClientRect();
  if (e.top < c.top) container.scrollTop -= c.top - e.top;
  else if (e.bottom > c.bottom) container.scrollTop += e.bottom - c.bottom;
}
