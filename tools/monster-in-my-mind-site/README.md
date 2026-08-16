# Monster in My Mind v1.0

Monster in My Mind is a responsive English × SEL × Art × AI activity for Taiwanese Grade 5–6 students. Students choose a worry topic, complete a supported English sentence, design a monster, choose an art style and background, and receive a fixed 16:9 image prompt.

## First-version boundaries

- No paid image API, API key, login, database, leaderboard, or public gallery.
- No student name or personal data is requested or stored.
- The emotion and worry phrase remain separate choices, so one event can be paired with different feelings.
- All Chinese translations and teaching content are local, fixed data; no real-time translation AI is used.
- The current ChatGPT Site is deployed privately for the owner only.

## Run locally on Windows

Requires Node.js 22 or newer.

```powershell
npm install
npm run dev
```

Open the local URL shown by Vinext. The validation commands are:

```powershell
npm run build
npm run lint
npm test
```

`npm test` builds the Site and server-renders the home route to verify that the product UI, metadata, and starter cleanup are present.

## Main project areas

- `app/MonsterApp.tsx` — client-side wizard state, navigation, reset, print, and privacy-first flow.
- `app/components/` — progress indicator, four steps, option cards, live monster preview, and result page.
- `app/data/content.ts` — bilingual worry categories, phrase bank, emotions, monster choices, styles, and backgrounds.
- `app/utils/content.ts` — sentence preview and local Auto background matching.
- `app/utils/prompt.ts` — deterministic 16:9 prompt template.
- `app/globals.css` — responsive, touch-friendly, keyboard-visible visual system and print styles.
- `.openai/hosting.json` — Sites project binding metadata.

## Future image API extension

The current product stops at `buildPrompt()` and only offers Copy Prompt. If image generation is added later:

1. Keep the current prompt builder as the single source of truth.
2. Add a server-side action or Worker route; never put an API key in browser code.
3. Store the provider key as a Sites secret, not in source control or `.env` committed files.
4. Add an explicit teacher-controlled image-generation action and clear failure/loading states.
5. Do not persist student sentences or generated images unless a separate consent and retention design is approved.

## SEL and accessibility decisions

The site uses large bilingual controls, visible selected states, keyboard focus styles, `aria-pressed` buttons, a labelled emotion dropdown, live sentence/prompt status, touch-safe hit areas, reduced-motion support, and a print-friendly result page. Family and looks options stay neutral; the site does not judge, score, rank, or publish a student's worry.
