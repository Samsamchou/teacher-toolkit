# HWG7 Sentence Review Firebase Functions

This directory is a deployable Firebase Functions v2 package. It has **not**
been installed, deployed, or connected to a production Firebase project.

## Exported endpoint

- Function ID: `evaluateSpeech`
- Region: `asia-east1`
- Method: `POST` (`OPTIONS` is supported for approved CORS preflight)
- Request JSON contains only `questionId`, `mimeType`, `audioBase64`, and
  numeric `metrics`.
- Extra fields are rejected. This prevents class-seat codes, names, and other
  student identifiers from being collected accidentally.
- The OpenAI request uses a generic filename and sends no question ID, student
  code, or student name. The only user content sent upstream is the audio.

Errors always return `consumeAttempt: false`; only a successful response whose
scoring result is valid returns `consumeAttempt: true`.

## Security configuration required before deployment

1. Keep `REQUIRE_APP_CHECK=true` in production and configure Firebase App Check
   in the web client. The client must send its token in
   `X-Firebase-AppCheck`. CORS is an additional browser boundary, not
   authentication.
2. Set `ALLOWED_ORIGINS` to the exact Firebase Hosting/custom origins, separated
   by commas. `*` is intentionally rejected. The defaults allow only the
   Firebase Hosting emulator origins.
3. Store the OpenAI key only as the Firebase Secret `OPENAI_API_KEY`.
4. Configure usage/billing alerts and a conservative Functions/OpenAI quota
   before classroom testing.

The existing frontend calls `/api/evaluate-speech`. Before deployment, add a
Firebase Hosting rewrite that routes that path to function ID
`evaluateSpeech` in `asia-east1`; this package deliberately does not change the
root `firebase.json`.

Example rewrite to review later:

```json
{
  "source": "/api/evaluate-speech",
  "function": {
    "functionId": "evaluateSpeech",
    "region": "asia-east1"
  }
}
```

## Local preparation commands (not run during scaffold creation)

```powershell
npm --prefix functions install
npm --prefix functions run sync-bank
firebase functions:secrets:set OPENAI_API_KEY
firebase deploy --only functions:evaluateSpeech
```

Run the secret-setting and deploy commands only after choosing the new Firebase
project and explicitly approving deployment. Never put the key in source code,
Hosting files, Git, or a normal `.env` committed to the repository.

## Offline checks

```powershell
npm --prefix functions run check
npm --prefix functions test
```

`scripts/sync-question-bank.mjs` copies the current canonical bank into the
Functions deployment package and verifies 13 unique questions and an 80-point
pass threshold. Re-run it after any approved question-bank revision.
