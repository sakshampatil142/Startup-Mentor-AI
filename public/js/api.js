// ============================================================================
// DIFY CONFIG
// Fill these in with your own Dify app. Get them from the Dify dashboard:
// - DIFY_API_KEY: Studio -> your app -> "API Access" -> API Key (starts with app-)
// - DIFY_BASE_URL: usually https://api.dify.ai/v1 (or your self-hosted URL)
//
// NOTE: since there is no backend anymore, this key ships in the browser.
// Anyone who opens devtools -> Network can see it. That's fine for a demo /
// personal project, but do NOT do this for anything public-facing — for that
// you'd want a tiny proxy (even a single Cloudflare Worker) that holds the
// key server-side instead.
// ============================================================================
const DIFY_API_KEY = 'app-tdrrxZyGBF0Z9uQhQiE6Z6Wa'; // <-- replace with your key
const DIFY_BASE_URL = 'https://api.dify.ai/v1';

// Calls one agent step via Dify. `context` carries whatever earlier agents
// already produced, so later agents can build on real prior findings instead
// of contradicting them.
async function callAgent(step, idea, context) {
  const res = await fetch(`${DIFY_BASE_URL}/completion-messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DIFY_API_KEY}`
    },
    body: JSON.stringify({
      inputs: {
        step,
        idea,
        context: JSON.stringify(context || {})
      },
      response_mode: 'blocking',
      user: 'startup-mentor-ai-frontend'
    })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `The ${step} agent failed`);
  }

  return extractJson(data.answer, step);
}

// Models sometimes ignore "JSON only" instructions and add a preamble,
// a trailing note, or wrap the object in prose/markdown fences. Try the
// strict path first, then fall back to pulling out the first balanced
// {...} block.
function extractJson(text, step) {
  const fenceStripped = (text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  try {
    return JSON.parse(fenceStripped);
  } catch (_) {
    // fall through to the balanced-brace fallback below
  }

  const start = fenceStripped.indexOf('{');
  const end = fenceStripped.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(fenceStripped.slice(start, end + 1));
    } catch (err) {
      console.error(`Could not parse Dify output for step "${step}" as JSON. Raw output was:\n`, text);
      throw new Error(`The ${step} agent's response was not valid JSON — see browser console for the raw output.`);
    }
  }

  console.error(`Could not parse Dify output for step "${step}" as JSON. Raw output was:\n`, text);
  throw new Error(`The ${step} agent's response was not valid JSON — see browser console for the raw output.`);
}
