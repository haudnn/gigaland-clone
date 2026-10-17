# Brief — gigaland-clone product film

Every line of the brief was left blank, so each one is decided here, with a one-line reason.

| Field | Decision | Why |
|---|---|---|
| mode | **product** | The repo is a finished page; the page itself is the most honest hero. |
| subject | **This repo: the Gigaland NFT-marketplace homepage rebuilt in HTML + CSS** (`haudnn/gigaland-clone`) | The branch was made "to make a video" inside this repo; the film is about the work in it, not about gigaland.io. |
| viewer | Developers, recruiters and reviewers scrolling a portfolio or GitHub feed. They care whether the build is faithful and the details (hover states, sticky header, grid) are real. | A clone project's audience is people judging front-end craft. |
| end state | **Know** it is one HTML file + hand-written CSS that reproduces the real interactions, and **go to** the repo URL. | A portfolio piece wins when the viewer opens the code. |
| length | **20 s, 16:9 1920×1080 + 9:16 1080×1920** (recomposed, not cropped) | 20 s fits 7 compositions at product pace (1.4–3.5 s each); 9:16 for Shorts/Reels, 16:9 for GitHub README / LinkedIn. |
| frame rate | **60 fps** | UI/product rule; scroll and hover motion need it. |
| brand | Derived from the repo: `#8364E2` / `#403f83` (base.css), surfaces `#212428` / `#282b2f`, text `#a2a2a2`, heart `#ec7498`; **DM Sans** (base.css); logo `assets/img/logo-light.png` used as-is, never redrawn. | Brief says derive from the product. No SVG logo exists in the repo and gigaland.io is unreachable from the build container, so the PNG is used at ≤2× its pixel size. |
| facts | The repo itself (`index.html`, `assets/css/*`, git remote). Logged in `facts.json`. | No other source was given; the repo is the only thing the film may claim about. |
| assets | Captured from the live page (Playwright, 2×) → rebuilt as live HTML/SVG components. Images: `background.jpg`, `women-with-vr.png`, `logo-light.png`. | The page hotlinks its NFT/avatar images from gigaland.io, which is blocked here; card art therefore uses crops of the repo's own hero artwork (flagged in `human-check.md`). |
| style | Dark "space" UI of the page itself; type-led motion; the purple accent shape is the thread. No references supplied, so the bar is the best SaaS/product launch films (Linear, Vercel, Stripe-style UI films): rebuilt UI, crisp type, cuts on beats. | Matches the subject; no references to study, so principles only. |
| sound | **music + sfx**, both synthesised in code (numpy/scipy), no voice. | No voice actor or TTS key; a 20 s UI film reads best without narration and must work sound-off anyway. |
| autonomy | **unattended** — ◆ gates logged in `ledger.md` instead of stopping. | User left it blank and asked only "make a video"; stopping at 4 gates would stall the session. |
| toolchain | **HTML + custom frame renderer** (Playwright → PNG frames → ffmpeg). No GSAP: eases/springs written as pure functions of frame. | No Remotion install needed; full determinism; Chromium is preinstalled. |
| sign-off | End mark: `gigaland-clone` + logo; CTA `github.com/haudnn/gigaland-clone`; credit "Original design: Gigaland by Designesia". | The page's own footer credits Designesia; the film must not pass the design off as the user's or as gigaland.io's. |
