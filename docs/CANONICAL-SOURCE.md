# NAYIQ source and deployment

The maintained repository is `trikuta9081/aethonbeacon`, branch `master`.
The app entry point is the root `App.tsx`. Supporting modules, native projects,
assets, and localization catalogues are required parts of this same app.

On this Mac, the maintained checkout is:

`/Users/rajeshwerslathiia/Documents/Codex/2026-07-13/continuation/work/aethonbeacon-active`

Do not create another editable copy in Downloads or a second app directory.
Use a symlink when a shorter path is needed. Preserve Git history for recovery.

GitHub Pages builds current source with `export:web` on each push to master.
Its configured base path is passed through `NAYIQ_WEB_BASE_PATH`; this supports
both the GitHub project URL and a root custom domain without separate app trees.

The legacy Render Dockerfile serves the committed `dist` snapshot. That snapshot
is not the editable source and is not evidence of the version served by Pages.
Do not remove it until the legacy deployment configuration is retired or changed.
Do not open `dist/index.html` via file URLs to verify a release.

The intended brand domain is `nayiq.co`. Domain registration alone does not
connect it to GitHub Pages: DNS and the Pages custom-domain setting must agree.
Verify a rendered page after deployment, not only a successful workflow badge.
