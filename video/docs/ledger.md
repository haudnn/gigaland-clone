# Ledger

Each round: who judged, what they found, what changed, and before → after numbers. The builder never signs off its own work; every verdict below is from a fresh critic subagent.

## ◆ Gates (unattended mode, so they are logged here instead of stopping)
- **◆ Storyboard**: fresh critic said "one more pass". 9 problems, all applied (see Round 0).
- **◆ Style bible**: `style-bible.md`, with style frames taken from renders (see Round 1 stills).
- **◆ Audio**: analysed instead of played back, since no one can listen in this container. Results: −13.7 LUFS, true peak −1.4 dBTP, kicks within 1.8 frames of the grid (detector jitter; placement is sample-exact), sfx 1.8–17.9 dB above the music in their own bands.
- **◆ Delivery**: see `quality-bar.md`.

## Round 0: storyboard critic → "one more pass"
| # | Problem | Fix |
|---|---|---|
| 1 | Heart "tap" and count pop were invented (the CSS only has a hover colour). | Hover only: heart turns #ec7498, count stays 50, click sfx removed. |
| 2 | The 9:16 stacked/responsive layout was invented (responsive.css is empty). | 9:16 frames the real desktop page with a moving camera; nothing is reflowed. |
| 3 | The carrier broke at 8.0 s and 11.5 s. | One purple rounded rect throughout: selection → headline box → Explore button → 80 plate → Connect Wallet pill → timer pill → 20 % column → icon tile → type plate → URL pill. Each handoff is computed from the same page geometry, so it lands on the target's pixels. |
| 4 | Weak hook: static code until 1.0 s. | Frame 0 already shows the selected string lifting off its line. |
| 5 | Too many words on the end card. | "1 HTML file · 6 CSS files" moved to its own full-frame type beat (16–18 s); the end shows only the name, URL and credit. |
| 6 | The drop's result was too small. | Full-frame live scrollTop counter, which collapses into the header as it snaps solid on the downbeat. |
| 7 | Card rows repeated. | Guide card shown alone at macro scale; the slide-past was cut. |
| 8 | The glyph swing had no cause. | A cursor hovers the guide card (the CSS hover). |
| 9 | Hero too dense. | The header is already present and does not enter separately. |

## Round 1: first full render `out/r1_16x9.mp4`
Measured: 1920×1080, 60 fps, 1200 frames, 20.000 s. Frozen total **3.07 s** (fails; target ≤ 0.67 s). Longest still 0.63 s at 3.97 s. −13.8 LUFS, TP −1.2 dB.

- Sound-off read: **3/5**. The story was retold correctly (code → page → hover details → repo URL). Confusions: the counter's meaning, ghosted dive frames, `.l-2-4` too small, "clone" not clear until the end, and a static end.
- Fact check: **fail**, on 3 items: the counter had no facts entry, the lorem text had no facts entry, and F4's line numbers were off by one. Nothing invented; everything else was verified verbatim.
- Fixes applied: `px` unit and F22 for the counter; F23 for the lorem copy; F4 corrected to header.css:14-15; editor tab now reads `gigaland-clone / index.html` (F24); grid label enlarged 30 → 40 px; blur cap 26 → 18 px; micro-motion added to the hero hold, macro, type and end holds.
- Frame critic + director (r1): **one more pass**. Top items and what was done:
  1. The 80 moment fired 20 frames early and never held at 80. Fix: the count eases into 80 (f344), holds, crosses to 81 at f354 (code line lights up), and the plate collapses into the header, which is solid on f360 (the drop).
  2. The glyph swing had no hit and the glyph was ~10 % visible. Fix: the cursor's hover starts the CSS swing (`ease`, 0.7 s) on the beat at f900, and the thunk sfx moves to 15.0 s. Glyph opacity raised 0.2 → 0.42 (noted as a deviation in human-check).
  3. The headline ghosted under the header. Fix: hero text fades as it passes under the fixed header.
  4. The carrier changed colour on the plates, and the two plates shared a layout. Fix: the carrier stays #8364E2 on both plates. The type beat is now a split layout: counts on the left, the 7 real file names as tabs on the right, cascading on 16ths.
  5. Safe margins. Fix: the page top now sits 54–64 px below the frame top (starfield extended above), and the guide title is ≥108 px from the top.
  6. An orphan column card before the tiles. Fix: the centre tile lands first inside the column (order 2,1,3,0,4).
  7. Small text. Fix: collections shot pushed in from 1.3× to 1.62×, credit enlarged 22 → 26 px at 78 % white.
  8. Dead holds. Fix: the drop to the button starts 20 frames earlier; pushes and floats added.
  9. Soft headline landing. Fix: inOutCubic approach plus a 4.5 % landing bump that settles by spring.
  10. Sync: tiles 3–4 frames late and camera whooshes +2–5 frames. Fix: tile spring offset −13 f, and each camera move's midpoint re-centred on its whoosh frame.

## Round 2: `out/r2_*.mp4`
Measured, 16:9: frozen 0.92 s, longest still 0.20 s, no still run over 0.5 s, −13.8 LUFS, TP −1.2. 9:16: frozen 1.63 s, longest still 0.33 s.
- Fact check (r2): **pass**. Non-blocking notes applied: F21 range widened to 130–138; F5, F6 and F8 given line numbers; F7 notes the desktop media query; file tabs retimed so all seven are fully on screen.
- Sound-off (r2): landscape **3.5/5**, vertical **3/5**. The counter was still cryptic, there was no explicit CTA, and the 9:16 opening code was small. Fixes: the counter plate now stops under the live header, so the header visibly switches when the number passes 80, with a purple line running along its edge on `addClass`; "Read the source" added above the URL (F25); 9:16 code size retuned to fit inside the right UI margin.
- Frame critic + director (r2): **one more pass**. Fixes:
  - Dead scroll: scroll is 1.5 s shorter (362–452, inOutCubic); band above the fixed header masked; 9:16 zooms toward the card during the scroll.
  - Headline clipped at the left: hero push limited to s ≤ 1.43, so the headline keeps ≥ 80 px margin.
  - The hover had no visible result: the cursor now runs through three real CSS hovers (avatar border, `style.css:71-73`; art scale 1.02; heart #ec7498). No invented lift.
  - Tile sync: offset set from the spring's first crossing (8 f), so each tile lands on its tick; shot widened to s 1.45 so all five tiles are visible.
  - Type beat repeated the counter layout: it is now an inset card over a depth-blurred, dimmed page; "6 CSS files" is readable for ~0.75 s, and the tabs exit before the card shrinks.
  - Whoosh at f120 had no move: the drop to the button now runs 90–150, centred on it.
  - Dead holds: collections and guide pushes doubled; end drifts to the last frame.
  - Weak frame one: 16:9 code 44 → 54 px.
  - Contrast: the `addClass` line is white throughout (large-text 4.4:1); crossing is marked by weight and underline.
  - 9:16: hero recomposed (headline centred, pan to the portrait at 2.5–3.4 s); macro card moved inside the UI-safe area; scroll zooms 1.5 → 2.1 into the card.
  - Declined: logo in the 9:16 header-snap crop. The crop has to hold the Connect Wallet pill, because the carrier lands there; the logo returns on the end card.

## Round 3: `out/r3_*.mp4`
Measured: 16:9 frozen **0.27 s** (pass); 9:16 frozen 0.77 s, fixed by starting the pan 16 f earlier. −13.8 LUFS, TP −1.2.
- Sound-off (r3): landscape **4/5**, vertical **3/5**. Fixes: a `scrollTop()` label above the counter; `gigaland-clone` in the editor tab enlarged and bold.
- Fact check (r3): **fail** on 3 points, all fixed:
  - The avatar sits inside the card wrapper, so hovering it also triggers the art zoom. The zoom now starts with the ring at f516.
  - "1 HTML file / 6 CSS files" was not literally true for the whole repo, because the vendor font folders contain demo HTML and CSS. It now reads **"1 page" / "6 stylesheets"**, with an `assets/css/` header; F9 and F10 rewritten.
  - F21's claim text corrected to 130–138 with normalised indentation. F26 added for the avatar hover.
- Frame critic + director (r3): **one more pass**, described as "close to final". Fixes:
  - **Blocker:** the carrier pill blurred at the snap and smeared across the nav. It now lands crisp (motion blur off 357–368, label in by 358). It then leaves on a fast 42 f arc that dips below the header, clear of the nav text, and lands on the timer at f482.
  - **Blocker:** the kicker collided with the headline plate. The kicker wipe now runs after the drop (152–182).
  - Column highlight fill lowered from 42 % to 22 %, so it reads as a grid band rather than an empty card.
  - Collections reframed so "Hot Collections" stays inside the frame.
  - Dive starts 6 f earlier.
  - Wide hold push doubled.
  - Cursor now parks by the glyph.
  - Plate code bold for contrast; CTA white/bold and credit at 92 % white.
  - type_a mask 8 f earlier.
  - 9:16:
    - Pullback stops at two columns (1.7×).
    - Hero at 1.45× with a slimmer headline box, keeping it out of the right UI zone.
    - Macro dropped 40 px; collections heading hidden until its scene.
    - Code line spacing opened up to fill the frame.
    - Type card moved down 30 px.
