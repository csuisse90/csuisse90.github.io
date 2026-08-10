# Diagram gallery

Every figure on the site, rendered on its own so it can be looked at without
hunting for it inside a page. Regenerate with:

    bun run diagrams

`renderDiagrams.tsx` writes one HTML file per figure — the same SVG the site
serves, with the CSS custom properties resolved to literal colours so the file
stands alone. The PNGs are screenshots of those, taken with headless Chromium.

`checkDiagrams.ts` then parses each SVG and fails on:

- text overlapping a box it is not wholly inside,
- text overlapping other text,
- anything falling outside the viewBox.

It does not catch everything — text over a line or a circle is invisible to it,
and so is a layout that is merely ugly — so the PNGs are still worth looking at
after a change.
