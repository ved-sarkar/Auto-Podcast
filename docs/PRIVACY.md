# Privacy and data flow

## Default demo

The built-in fictional transcript and edit are bundled with the app. Loading them makes no provider request. The candidate contains no real interviews or audio. External font links were removed; the interface uses local fallback fonts.

Selecting local files reads them into browser memory and may create an object URL for local audio playback. Selection alone does not upload a file. Text export uses the browser's clipboard or download facilities. Do not paste confidential or personal content into a demonstration session.

## Optional providers

| Action | Destination when enabled |
| --- | --- |
| Edit a transcript | Google Gemini receives the transcript and prompt |
| Transcribe with an OpenAI key | OpenAI receives the audio; Gemini then receives the resulting transcript for editing |
| Transcribe without an OpenAI key | Gemini receives audio and then the transcript for editing |

There is no automatic switch to another provider on failure. Confirm the destination before each processing request. Provider charges, retention, policy, and account terms apply; this project does not promise zero retention or confidentiality by those services. Audio transcription is not independently checked against the recording.

## Local storage and credentials

This candidate does not save keys or transcripts to localStorage. Keys and editing state live in JavaScript memory for the current tab; refresh clears them. Custom editing prompts are stored in localStorage under `podcastEditorCustomPrompt`, so do not put secrets or private transcripts in a custom prompt. Clear the site's browser storage to remove saved prompts and any keys left by a prior version.

There is no backend secret vault. Browser extensions, developer tools, compromised dependencies, or injected scripts could access runtime keys. Do not place keys in source, environment variables prefixed `VITE_`, screenshots, logs, issues, or commits. This is a local prototype and does not claim production-grade credential protection.

## Release exclusions

Only reviewed source, configuration, tests, documentation, and newly authored synthetic examples belong in the proposed release. Recordings, original transcripts, private endpoints, credentials, local paths, installed packages, generated build output, and unrelated projects are excluded. Ignore rules provide convenience; the exact reviewed publication manifest remains the release boundary.
