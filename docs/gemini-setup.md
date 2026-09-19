# Gemini AI Setup

This project uses **Google Gemini** (via `@google/genai`) to power AI-generated learning content in Yuinx.

---

## Prerequisites

- **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey)
- Node.js 20+

## Environment Variables

Add to `.env` at the project root:

```env
GEMINI_API_KEY=your_api_key_here
```

The server reads this at startup in `server/index.ts`.

## Package

Uses the official Google Gen AI SDK:

```
npm install @google/genai
```

Replaces the older `@google/generative-ai` package.

---

## Architecture

```
lib/gemini.ts              ← Centralized Gemini client + all AI operations
server/prompts/            ← Prompt templates (course, quiz, thumbnail)
server/index.ts            ← Route handlers call lib/gemini.ts
```

### `lib/gemini.ts` — API Reference

```
initGemini(apiKey)         → GoogleGenAI instance
generateJsonContent(ai, prompt) → raw JSON response (generic)
generateCourseContent(ai, prompt) → { chapters, thumbnailPrompt }
generateQuizQuestions(ai, prompt) → Question[]
generateDailyBounties(ai, prompt) → GeminiBounty[] | null
generateThumbnailImage(ai, prompt) → { base64, mimeType } | null
```

### Model Selection

| Use | Model |
|---|---|
| Course generation (JSON) | `gemini-2.5-flash` |
| Quiz generation (JSON) | `gemini-2.5-flash` |
| Bounty generation (JSON) | `gemini-2.5-flash` |
| Thumbnail image generation | `gemini-2.0-flash-exp-image-generation` |

Models are defined as constants at the top of `lib/gemini.ts`. Update them to try newer models.

---

## Adding a New AI Feature

1. **Add the prompt** in `server/prompts/` (e.g. `myFeature.ts`)
2. **Add a function** in `lib/gemini.ts`:
   - For JSON output: use `generateJsonContent<T>()`
   - For image output: use `generateThumbnailImage()`
   - Add validation specific to your response shape
3. **Wire the route** in `server/index.ts` — import your new function and call it in the route handler

Example:

```ts
// lib/gemini.ts
export async function generateSummary(ai: GoogleGenAI, prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
  });
  return response.text ?? "";
}
```

---

## Pricing

Gemini 2.5 Flash is the most cost-effective option:

- **Free tier**: 15 requests per minute, 1,500 requests per day
- **Paid**: $0.15 per million input tokens, $0.60 per million output tokens

Check [Google AI Studio pricing](https://ai.google.dev/pricing) for the latest rates.

---

## Troubleshooting

| Error | Likely Cause |
|---|---|
| `503 AI generation not available` | `GEMINI_API_KEY` missing in `.env` |
| `Empty response from Gemini` | Prompt returned no content |
| `AI returned invalid chapter structure` | AI returned < 8 chapters |
| `401 Unauthorized` | Clerk token expired or missing |
