# XIME Logo Usage

Canonical brand mark for the Magis Centre and all XIME institutional digital surfaces.

## Files

**`XIME_LOGO.svg`** — all-red wordmark, `#e91f27`. Primary logo.

**`XIME_LOGO_WHITE.svg`** — white wordmark, `#ffffff`. Used only when the logo sits on a dark-navy or red background.

Both files use the same `viewBox` so they drop in interchangeably without layout shift.

## When to use which

| Context | File |
|---|---|
| Login page header, marketing pages, PDF letterheads, light-background headers | `XIME_LOGO.svg` |
| Dark-navy topbars (Magis Centre application chrome), dark email signatures, hero banners with dark backgrounds | `XIME_LOGO_WHITE.svg` |
| Printed documents (light paper) | `XIME_LOGO.svg` |
| Favicon source | Derive a square crop from `XIME_LOGO.svg` (see Implementation notes below) |

The rule in one line: red on light, white on dark. Nothing else.

## What NOT to do

Do not inline the `<em>I</em>` text trick anywhere new. The SVG replaces that approach across the platform.

Do not change the red value from `#e91f27`. The red is the brand.

Do not use the logo smaller than 24 pixels tall. Legibility drops below that size and the letterforms become mud.

Do not rotate, skew, or apply drop-shadows to the mark. Keep it flat.

Do not place the logo on backgrounds that are neither clearly light nor clearly dark. On a mid-grey background, use the red mark with a subtle white pill container behind it rather than switching to the white variant.

## Implementation in code

**HTML top bar (recommended):**

```html
<div class="tb-l">
  <img src="assets/logo/XIME_LOGO_WHITE.svg" alt="XIME" class="tb-logo">
  <div class="sep"></div>
  <div class="ttl">Magis Centre · Annual Development Review</div>
</div>
```

```css
.tb-logo {
  height: 28px;
  width: auto;
  display: block;
}
```

**Minimum height: 24px. Recommended in topbars: 28 to 32px. Recommended on login hero: 64 to 96px.**

## File locations

Repository path: `/assets/logo/`

Files tracked:
- `/assets/logo/XIME_LOGO.svg`
- `/assets/logo/XIME_LOGO_WHITE.svg`
- `/assets/logo/LOGO_USAGE.md` (this file)

## Source file

The original vendor SVG is preserved at `/assets/logo/source/XIME_LOGO_FULL.svg` (if present) for reference. It contains the full logo including the tagline stack. The two files in active use are the wordmark-only versions derived from it.

## Change log

| Date | Change |
|---|---|
| 2026-04-20 | Initial canonical asset. Wordmark-only, all-red and white variants. Replaces the inline `<em>` text trick used previously. |
