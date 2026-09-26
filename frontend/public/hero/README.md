# Phone hero film — drop-in slot

The landing hero (`src/features/landing/MorphHero.tsx`) shows an on-brand
**abstract violet gradient** inside the phone by default — no people, no network
needed. It will play a video instead if you drop one here:

    frontend/public/hero/phone-film.mp4   →   served at  /hero/phone-film.mp4

If that file is missing (or fails to load), the hero falls back to the animated
gradient, so the page always shows something. Drop your own clip here and the
hero uses it instead.

## What to pick
A short, seamless-looping **vertical / portrait** clip works best (the frame is
a 9:19.5 phone screen; `object-cover` crops the centre). Go for an **abstract /
gradient motion** clip — flowing liquid, ink, or soft light, ideally in
**purple / violet** tones so it ties into Morph's accent. No people. Keep it
small (a few MB) and muted.

## How to add it (run on your Windows machine, from the repo root)

PowerShell:

    mkdir "frontend\public\hero" -Force
    # then save your chosen .mp4 as:
    #   frontend\public\hero\phone-film.mp4

### Option A — vendor the ORIGINAL demo film locally (offline fallback)
    curl.exe -L -o "frontend\public\hero\phone-film.mp4" `
      "https://cdn.21st.dev/assets/mirror/08/087016656d54314ba07a3fd493f37c05a648544cd7b22137373ad7dd104a4340.mp4"

### Option B — abstract / gradient clip, no people (recommended)
Open one of these, download a **vertical** clip (use the download button on the
page), and save it as `frontend\public\hero\phone-film.mp4`:

- Pexels — purple light swirls loop (matches Morph's accent):
  https://www.pexels.com/video/mesmerizing-abstract-purple-light-swirls-loop-35393045/
- Pexels — abstract gradient, vertical (browse):
  https://www.pexels.com/search/videos/Abstract%20Gradient%20Vertical/
- Pexels — pastel gradient background:
  https://www.pexels.com/video/gradient-background-8419658/
- Mixkit — vertical abstract liquid motion:
  https://mixkit.co/free-stock-video/vertical-abstract-liquid-motion-101744/
- Mixkit — vertical fluid clips (browse):
  https://mixkit.co/free-stock-video/discover/fluid/?orientation=vertical

Pexels and Mixkit clips are free to use (check each clip's license). No code
change is needed — same filename, and the hero picks it up on the next load.

> Note: the AI sandbox that edited these files is network-restricted (an
> allowlist proxy blocks cdn.21st.dev and the stock-video hosts), so it could
> not download the file for you. The two commands above run fine on your
> machine.
