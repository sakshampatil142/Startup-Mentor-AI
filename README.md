# Startup Mentor AI

A 5-agent AI panel that takes a one-line startup idea and returns a full
business report: viability score, market analysis, SWOT, revenue model,
legal checklist, competitor table, growth charts, and a 30-day roadmap —
exportable as a PDF.

## What was actually broken

Your uploaded `dashboard.html` and `index.html` referenced five files that
didn't exist anywhere in the project:

- `css/dashboard.css`
- `css/style.css`
- `js/api.js`
- `js/dashboard.js`
- `js/main.js`

That's the entire bug — the browser had no styling and the "Generate" button
had no JavaScript behind it, so nothing happened when you clicked it. This
version adds all five files, plus a real backend, so the button works
end to end.

## What's new beyond a fix

- **A real 5-agent pipeline**, powered by Dify: Business Analyst → Market
  Research → Finance Advisor → Legal Expert → Report Generator run as five
  sequential calls to a single Dify app, each one handed the prior agents'
  real findings so later agents build on earlier ones instead of
  contradicting them. The "AI Analysis Progress" panel now reflects genuine
  work — each row flips from Waiting → Running → Done as its actual API call
  completes.
- **Every dashboard section is wired to real output**: KPI cards, the score
  dial, business model canvas, competitor table, SWOT, both charts, legal
  checklist, roadmap, funding options.
- **Saved project history** (browser localStorage) — revisit or delete past
  analyses without re-running the panel.
- **Dark/light theme toggle**, mobile-responsive sidebar, and toast
  notifications instead of silent failures.
- **PDF export** that actually pulls from the generated report, not a
  placeholder.
- **A rebuilt landing page** — the original nav linked to "Features / How it
  Works / Pricing / Contact" but only Features existed. Added real
  How-it-Works, Pricing, and Contact sections, plus a working mobile menu.
- **Visual overhaul**: a dark investor-panel look — navy/near-black stage,
  cash-green and gold accents, a radial "spotlight" hero, and an animated
  circular score dial as the signature element (color shifts green/gold/red
  with the score, like a panel verdict).

## Setup — no backend, just static files + Dify

There is no Node server anymore. `public/js/api.js` calls a Dify app
directly from the browser. To set it up:

1. In Dify, create a new app of type **"Text Generator" (Completion App)**.
2. In that app's **Instructions/Prompt** box, paste the prompt from
   `DIFY_PROMPT.md` (in this repo) exactly as-is.
3. Under **Context / Input Fields**, add three input variables (these are
   referenced as `{{step}}`, `{{idea}}`, `{{context}}` in the prompt):
   - `step` — Text (short)
   - `idea` — Paragraph
   - `context` — Paragraph
4. Go to **API Access** in the app and copy the **API Key** (starts with
   `app-`) and the base URL (`https://api.dify.ai/v1` on Dify Cloud, or your
   self-hosted URL).
5. Open `public/js/api.js` and set `DIFY_API_KEY` and `DIFY_BASE_URL` at the
   top of the file to those values.
6. Serve the `public/` folder as static files — e.g. `npx serve public`, the
   VS Code "Live Server" extension, or just open `public/index.html`
   directly in a browser.

⚠️ Since there's no backend, the Dify API key ships in the browser and is
visible in devtools → Network to anyone who opens the page. Fine for a demo
or a personal/local project; not something to deploy publicly as-is. If you
ever need that, put a one-endpoint proxy (e.g. a Cloudflare Worker) in front
of Dify that holds the key server-side.

## Project structure

```
startup-mentor-ai/
├── DIFY_PROMPT.md      # the exact prompt to paste into your Dify app
└── public/
    ├── index.html         # landing page
    ├── dashboard.html      # the app
    ├── css/
    │   ├── style.css         # landing page styles
    │   └── dashboard.css      # dashboard styles
    └── js/
        ├── main.js            # landing page interactions
        ├── api.js              # calls the Dify app directly (DIFY_API_KEY here)
        └── dashboard.js         # pipeline orchestration + all rendering
```

## How a request flows end to end

1. User types an idea and clicks **Generate**.
2. `dashboard.js` calls `callAgent()` in `api.js` five times in sequence —
   one per agent — marking each row Running → Done live in the UI.
3. Each call hits Dify's `/completion-messages` endpoint with `step`,
   `idea`, and `context` (every prior agent's JSON output so far) as inputs,
   so the Finance Advisor knows what the Market Research agent found, the
   Report Generator knows everything, etc.
4. The single Dify prompt reads `{{step}}` and plays only that one agent's
   role, returning **only that agent's JSON** — `api.js` parses it out of
   `data.answer`.
5. Once all five return, the frontend renders KPIs, the score dial, the
   business model canvas, SWOT, competitor table, two Chart.js charts, and
   the legal/roadmap/funding lists — then saves the full report to
   localStorage history.
6. **Download PDF** builds a text report directly from that same data with
   jsPDF.

## Good interview talking points

- The panel is agentic in a literal sense: five separate specialized calls
  that pass context forward, not one call pretending to be five.
- Every section either renders real agent output or an honest "No data
  returned" fallback — nothing silently shows fake placeholder text if the
  model returns something unexpected.
- Natural next step to mention: cache/re-use an agent's output when only the
  idea's *industry* changes slightly, instead of re-running the whole panel
  every time — good extensibility story.
