# Style bible

## Colour (6, all sampled from the repo's CSS)
| Token | Hex | Source | Use |
|---|---|---|---|
| purple | `#8364E2` | base.css `--secondary-color` | **The carrier** when it is a UI element (selection, buttons, icon tile), rules, the 20 % column border |
| deep | `#403f83` | base.css `--primary-color` | The carrier when it fills the frame (the 80 plate, the type plate, the URL pill). White on deep is 9.9:1. |
| ink | `#212428` (+ card tint `#282b2f`, guide `#26292d`) | style.css `.content`, `.content__new-wrapper` | Page and editor ground |
| white | `#ffffff` | — | Type |
| grey | `#a2a2a2` | base.css `--text-color` | Secondary type, code punctuation (6.1:1 on ink) |
| pink | `#ec7498` | style.css heart hover | Only for the one heart-hover result |

Imagery comes only from the repo: `background.jpg` (starfield) and `women-with-vr.png` (portrait and marble). Card art is cropped from these two, because the page hotlinks its NFT images from gigaland.io, which is unreachable here.

## Type (local, pinned)
- **DM Sans** (variable, `fonts/DMSans-latin.woff2`) is the page's own face. Weight 800 for display, 500–700 for UI.
- **JetBrains Mono** (`fonts/JetBrainsMono-latin.woff2`) is used only for real code and the URL.
- Icons: Font Awesome 5.15.4 solid and Themify SVG paths from `assets/font/`. These are the page's own icon sets.

## Texture
No grain, no particles, no gradients beyond the page's own hero fade and a dark vignette on the end card. Depth comes from the page's real box-shadows, and motion blur only on fast moves (directional SVG blur from per-frame velocity, capped at 18 px).

## Motion vocabulary
- **Carrier**: one purple rounded rect. It travels on an arc and arrives with ease-in-out, then lands with a spring squash (x +16 %, y −20 %).
- **Type**: enters through a mask from below (outQuint, ~24 f) and leaves upward (inCubic, ~12 f). It never fades in place.
- **Camera**: the page is one continuous plane. Moves are inOutQuint with log-space zoom; holds always drift (push or float).
- **Product behaviours keep their own timing**: card hover is scale 1.02 over 0.3 s linear (from the CSS); the glyph turns −25° over 0.7 s with CSS `ease`; the header switches the instant scrollTop > 80.
- **Entrances on the beat**: the five tiles fall on 8th notes with spring (ω 18, ζ 0.48).

## Style frames (rendered in code)
See `out/qa/*_contact.png`. Frame 0 (code + lifting selection), 3.3 s (hero), 8.5 s (macro card).
