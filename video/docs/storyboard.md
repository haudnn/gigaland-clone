# Concept & storyboard

## Three directions
1. **"Selection → Page"** (picked). A text selection in the source code lifts off as a purple shape and *becomes* the page: the selection turns into the Explore button, the button becomes the header pill, the timer pill, the check badges, the icon tile and finally the end plate. Code and pixels share one shape, which is exactly what a clone project is about.
2. **"Scroll-through"** — one continuous scroll down the page with the camera diving into each section. Honest, but it reads as a screen recording and never leaves one layout.
3. **"Blueprint"** — wireframe grid lines draw first and the UI fills in. Strong for the grid moment, but generic for the other five scenes.

Picked 1: it has a carrier object (the purple rounded shape, `#8364E2`) that can land on the same pixels across every handoff, and it lets real code from the repo appear on screen as type.

## Three signature moments
- **The lift** (1.0 s): the highlighted headline string in `index.html` peels off the editor and lands as the hero headline, while its highlight drops to become the Explore button.
- **The 80-pixel line** (6.0 s, the drop): a ruler counts the scroll; when it reads 80, the header slams solid on the downbeat.
- **The tilt** (15.5 s): the giant wallet glyph behind "Set up your wallet" swings −25°, the way the CSS hover does, and the purple icon tile flies to camera and becomes the end plate.

## Storyboard (16:9, 60 fps, 120 BPM → 1 beat = 30 frames)

| Time | On screen | Purpose | Audio cue | Exit | Carries over |
|---|---|---|---|---|---|
| 0.0–2.0 | Code editor, `index.html` lines 132–138 at macro size; the headline string is already highlighted purple (frame 1 finished). Highlight brightens, the string peels off on beat 2 (1.0 s). | Hook: "this page is made of this code". | Pad + arp; soft whoosh at 1.0 s lift. | Editor drops back and away (scale 1→0.8, blur) as the string flies forward. | Headline string, purple highlight bar. |
| 2.0–5.0 | Starfield (`background.jpg`). Headline lands left; kicker "GIGALAND MARKET" wipes in; the highlight bar shrinks into the **Explore** button (squash on land 3.5 s); marble window unfolds right and the VR portrait rises into it; header slides down. | Show the real hero, rebuilt live. | Kick enters 2.0 s; click on button land 3.5 s; whoosh 2.0. | Page starts to scroll up. | Explore button → header pill. |
| 5.0–8.0 | Same page, scrolling. A mono ruler at the left edge counts `scrollTop`. At **80** (6.0 s, the drop) header snaps to solid `rgba(34,38,46,.9)` with label `> 80 → .header.active`. Wallet row (6 names) slides through. | The one scripted behaviour in the repo, made visible. | Riser 4.0–6.0 s → drop + snap impact 6.0 s. | Camera dives into the first New Items card's timer pill. | Purple timer pill. |
| 8.0–11.5 | Macro New Items card: art scales 1.02 under cursor, cursor taps the heart → pink `#ec7498`, count pops. Pull back: the card deals into a row of 4 with "New Items" title. | Hover states are real. | Click 9.5 s; whoosh 10.0. | The row slides left and up out of frame; Hot Collections tiles fall in. | Check badges. |
| 11.5–14.5 | Overhead, slight tilt: five Hot Collections tiles drop onto a 5-column grid in 8th-note stagger; 20 % column guides draw; label `.l-2-4 { flex: 0 0 20% }`. | The grid is real CSS. | Ticks per tile (high, quiet); whoosh 11.5. | Grid guides fold into one card; three guide cards slide in. | Purple icon tile. |
| 14.5–17.0 | Macro guide card "Set up your wallet": giant wallet glyph swings −25°; three cards (wallet / cloud-up / tag) slide past. | Last hover detail; builds to the end. | Whoosh 14.5; soft hit 15.5. | Purple icon tile flies to camera, fills frame. | Purple plate. |
| 17.0–20.0 | End plate: logo (PNG, as-is), `gigaland-clone`, `1 HTML file · 6 CSS files`, URL `github.com/haudnn/gigaland-clone`, credit line. Micro-drift, stars twinkle. | Name + CTA. | Final chord hit 18.0 s, tail to 20.0. | — | — |

**Sound-off read:** code → the same words become a website → scrolling makes the header turn solid at 80 → cards respond to hover → grid is 5 × 20 % → wallet icon swings → repo name and URL. All words are on screen; nothing relies on audio.

## 9:16 recomposition
Same beats and handoffs. Code editor shows fewer, shorter lines at larger size; hero stacks portrait above headline; New Items deals into a 2×2; Hot Collections becomes a vertical stack of 5 tiles with 20 % guides rotated to rows? No — guides stay as columns over a single row of 5 narrow tiles shown overhead, then the stack; guide cards stack vertically. Content kept inside y 220–1540 and x 60–960 (clear of platform UI).
