# Changelog

## v6 — Expanded automatic tab-closing defaults

- Added 24 non-browser app families to the automatic tab/document-close list,
  in addition to Sublime Text and the browser detection retained from v5.
- Added common text/code editors, file managers, notes/document/image apps,
  and Thunderbird. Package aliases match exactly, case-insensitively, with
  an optional `.desktop` suffix.
- Added an expandable built-in app summary in Preferences > App behavior,
  sourced from the same catalog used at runtime.
- Kept all saved app overrides and shortcuts. Window overrides still take
  precedence over tab overrides and automatic defaults. No migration required.
- Kept the v5 shortcut-delivery implementation unchanged. Apps still handle
  their native Ctrl+W behavior, including save prompts and final-tab behavior.
- Added 60 headless regression tests and a documented app-ID catalog.

## v5 — Per-app behavior

- Added Sublime Text to automatic native Ctrl+W passthrough.
- Added Automatic, Close tab, and Close window choices for installed apps.
- Added manual desktop ID / WM_CLASS rules and app-rule reset controls.
