# Validation record

Checked locally on 2026-10-07. No provider credentials, real recordings, private transcripts, or live provider requests were used.

| Check | Result |
| --- | --- |
| Node regression tests | 27 passed, zero failures/skips |
| Static component rendering | Synthetic demo and full deletion rendered successfully; no browser interaction implied |
| Production bundle | Passed with Vite 5.4.19; 1,381 modules transformed |
| Source preservation | Original copied-file hashes checked separately in private release evidence |
| Fresh dependency installation | Not run; existing local dependencies were reused in an isolated validation copy |
| Live Gemini / Whisper compatibility | Not tested |
| Browser interactions / screenshot | Not verified; the available environment previously blocked local browser launch and loopback access |
| Packaging / hosted deployment | Not attempted |
| Current dependency advisory audit | Not performed; no registry or audit-service upload |

The test suite covers rejection of additions, rewrites, reordering, malformed JSON, invalid containers, and oversized content; repeated and Unicode words; complete deletion; long-passage alignment; original-string reconstruction; derived metadata; configuration without generation; and mocked provider errors without fallback.

The build used the candidate source in a private validation copy, linking existing installed packages without copying them into the proposed release. It used Vite's build API with `configFile: false`, the React plugin, and relative asset paths. A stale Browserslist dataset warning was recorded. No automatic dependency update was run.

These checks establish local validation behavior and successful bundling. They do not establish editorial quality, transcription accuracy, browser accessibility, production security, current API availability, or ownership/publication rights. The fictional demo is a fixed fixture, not evidence of model quality.

Re-run `npm test` and `npm run build` after an approved fresh installation. Review the demo manually in a browser, including long text, complete deletion, copy/download, file selection, and the live-mode confirmation flow, before describing the app as fully browser-tested.
