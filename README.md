# Math Builder (React)

Learner-first React app: brand landing, name-only entry (no passwords), a polished student desk, Driving Age case studio, Coach chat, and PDF submit.

## Quick start

```bash
cd math-builder-web
npm install
npm run dev
```

- App: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- API: [http://127.0.0.1:5174](http://127.0.0.1:5174) (proxied via Vite as `/api/*`)

Optional Coach model: copy `.env.example` → `.env` and set `OPENROUTER_API_KEY`.

## What’s included (aligned to PRD R4 / R5 / R9 / R12 / R14)

| Route | Purpose |
|---|---|
| `/` | Brand landing — vision: real-world math as a Hero |
| `/enter` | Name only — no passcode |
| `/home` | Hero desk: primary next step, weekly goal, careers, journey spine |
| `/warmup/driving-age` | Skippable readiness check (scatter / slope / fit) |
| `/catalog` | Case list (Driving Age seeded) |
| `/profile` | Fields, points, still-wondering, weekly goal |
| `/case/driving-age` | Case studio: open → five-part pitch → submit → reflect |
| Interactive HTML | `/cases/driving-age/published/Driving Age - Interactive.html` |

See `PRD.html` for the full R1–R14 product contract.

Progress and name live in `localStorage`. Submissions land in `submissions/<case>/<receipt>/`.

## Stack

Vite · React · TypeScript · React Router · Motion · Express (submit + coach)

The Python authoring pipeline in `Math Case Study/math-builder` is unchanged — this app is the new learner surface.
