# Mac-like Close and Quit

GNOME Shell extension with configurable close and quit shortcuts. This package
keeps the GNOME Shell 50 / 51 targets from v5, including Wayland sessions.

## New in v6

Automatic tab/document closing now includes **25 non-browser app families**
(24 additions plus Sublime Text), alongside the existing browser detection.

| Category | Automatic tab/document-closing apps |
| --- | --- |
| Text and code editors | Sublime Text; Visual Studio Code / Insiders; VSCodium / Insiders; Code - OSS; Cursor; Zed; GNOME Text Editor; gedit; Kate; KWrite; Geany; Mousepad; Xed; Pluma. |
| File managers | GNOME Files (Nautilus); Dolphin; Nemo; Thunar; Caja; PCManFM; PCManFM-Qt. |
| Notes, documents and images | Obsidian; Okular; GIMP; Thunderbird. |

Preferences now has an expandable **Built-in tab-closing apps** summary. Each
installed app still shows **Automatic (tab)** or **Automatic (window)**, using
the same matching rules as the running extension. See
[the full app ID catalog](docs/default-apps.md) for recognized package aliases.

**Saved per-app choices and keyboard shortcuts are preserved.** New defaults
apply to apps left on Automatic. No reset, settings migration, or manual app
selection is needed. A saved Close window rule continues to win, including for
an app newly added to the defaults.

The v5 per-app selector, manual identifiers, immediate settings updates and
native Ctrl+W passthrough remain available. The shortcut-delivery code in
`extension.js` is unchanged from v5.

## Default behavior

| Shortcut / app | Behavior |
| --- | --- |
| Ctrl+W in a recognized browser | Native Ctrl+W, handled directly by the browser. |
| Ctrl+W in a built-in tab-based app | Native Ctrl+W, handled directly by that app. |
| Ctrl+W in other apps | Request that the focused window close. |
| Ctrl+Q | Request that the focused application quit, including its windows. |

Recognized browsers retain the v4 detection rules, including Firefox, Chrome,
Chromium, Brave, Edge, Vivaldi, Opera, GNOME Web, and others.

For tab-closing apps, the extension temporarily unregisters its global Ctrl+W
binding while that app has focus. Physical Ctrl+W goes straight to the app,
without a simulated key or extension-imposed delay. If you configure another
close shortcut, such as Super+W, the extension sends a best-effort simulated
Ctrl+W to those apps after you release the modifiers.

## Install or upgrade

Save the updated download as `mac-like-shortcuts-v6.zip` in `~/Downloads`.
The archive includes the compatible compiled settings schema and is ready to install.
Schema key names, types, paths, and default values are unchanged from v5.

1. Disable the currently installed extension:

   `gnome-extensions disable mac-like-shortcuts@local`

2. Install the update:

   `gnome-extensions install --force ~/Downloads/mac-like-shortcuts-v6.zip`

3. **Log out and log back in** so GNOME Shell loads the new code and settings schema.

4. Enable the extension:

   `gnome-extensions enable mac-like-shortcuts@local`

5. Open its preferences:

   `gnome-extensions prefs mac-like-shortcuts@local`

To inspect its status:

`gnome-extensions show mac-like-shortcuts@local`

Existing shortcut settings are preserved. If you previously chose a close
shortcut other than Ctrl+W, that choice remains; use the Keyboard shortcuts page
to change it. GNOME's own Close Window shortcut and other extensions must not
also capture the same keys.

## Choose which apps close tabs

Open **Preferences → App behavior**. Under **Installed applications**, find the
app or use the search button, then choose its behavior:

| Choice | Result |
| --- | --- |
| Automatic (tab) / Automatic (window) | Use built-in detection: browsers and the apps listed above handle Ctrl+W; other apps close the focused window. |
| Close tab | Let the app handle Ctrl+W for its native tab or document closing. |
| Close window | Request closure of the focused window, even for a browser or another built-in tab-based app. |

Set an unlisted tabbed app to **Close tab** if it already supports Ctrl+W for
closing a tab. Choose **Automatic** to remove that app's explicit override and
use the new defaults. Expand **Built-in tab-closing apps** to review the catalog.

**Reset apps** clears all app overrides. The separate **Reset** button on the
Keyboard shortcuts page restores Ctrl+W and Ctrl+Q without clearing app choices.

### Add an app manually

In **Add an app manually**, enter one desktop application ID or WM_CLASS and
click **Add**, or press Enter. This enables Close tab for that identifier.
Change it to Close window in its row if desired. The remove button restores
automatic behavior for a custom identifier.

Examples of identifiers:

- `org.gnome.TextEditor.desktop`
- `code.desktop`
- `sublime_text`

These are examples of app identifiers, not executable paths. Matching checks
the focused window's desktop application ID, WM_CLASS, and WM_CLASS instance.
Custom rules match exactly, ignoring surrounding whitespace, letter case, and
an optional trailing `.desktop`. For example, `Code.desktop` and `code` refer
to the same identifier. Wildcards and partial-name matching are not supported.

An app may expose multiple identifiers. If one matches a Close window rule and
another matches a Close tab rule, **Close window wins**. Remove a conflicting
custom identifier if an app's choice seems ineffective. A custom row set to
Automatic has no saved override and may disappear when preferences reopen.

### Optional: set rules with GSettings

The GUI is the simplest way to maintain rules. Advanced users can inspect the
extension-local schema with an explicit schema directory:

`gsettings --schemadir "$HOME/.local/share/gnome-shell/extensions/mac-like-shortcuts@local/schemas" get org.gnome.shell.extensions.mac-like-shortcuts tab-close-apps`

Set the complete Close tab override list (this replaces the previous list):

`gsettings --schemadir "$HOME/.local/share/gnome-shell/extensions/mac-like-shortcuts@local/schemas" set org.gnome.shell.extensions.mac-like-shortcuts tab-close-apps "['code.desktop', 'org.gnome.TextEditor.desktop']"`

Set the complete Close window override list:

`gsettings --schemadir "$HOME/.local/share/gnome-shell/extensions/mac-like-shortcuts@local/schemas" set org.gnome.shell.extensions.mac-like-shortcuts window-close-apps "['firefox.desktop']"`

Both override lists default to empty; the built-in automatic detection still
applies. Default apps are kept in `appRules.js`, not written into these lists. The precedence is Close window override, then Close tab override, then
automatic detection.

## Limits and verification

- **Close tab uses the app's existing Ctrl+W behavior.** The app must support
  tab or document closing with Ctrl+W. Its own keybindings, save prompts, and
  last-tab behavior still apply; closing the final tab may close the window.
- Alternate close shortcuts use simulated Ctrl+W and may be imperfect under
  Wayland. Ctrl+W itself uses native passthrough in selected apps.
- App identification depends on the IDs/classes reported to GNOME. A custom
  identifier can handle an unrecognized launcher or package variant.
- Window-close and quit requests are graceful. Applications can prompt about
  unsaved work, refuse closure, or keep background processes running.
- Terminals, JetBrains IDEs, Emacs and Vim are deliberately not added to the
  automatic tab list. Their Ctrl+W actions differ from tab closing. Their
  existing window-close default is unchanged. A manual Close tab rule only
  passes through Ctrl+W; it cannot remap Ctrl+W to Ctrl+Shift+W or Ctrl+F4.
- Native app keymaps, Vim/Emacs modes, plugins, embedded terminals, pinned tabs,
  and dialog focus can change what Ctrl+W does. The extension does not override
  those internal app behaviors.
- **60 automated tests passed**, covering app aliases and normalization,
  exclusions, conflicting overrides, focus/settings changes, simulated custom
  shortcuts, preference controls, reset behavior, and listener cleanup. Runtime
  and preference tests use mocked GNOME APIs; there has been **no live GNOME
  Shell / GTK session or real keyboard delivery test** in this environment.
- JavaScript syntax, metadata, XML schema definitions, compiled-schema loading
  through GLib, and ZIP integrity were checked. The compatible compiled schema
  from v5 is retained because no schema keys, types or default values changed.

## Development and tests

The ZIP contains the complete extension source, documentation, and headless
tests. Node.js 18 or newer is needed only to run the tests, not to use the
extension. From the extracted source directory:

`node --test tests/*.test.mjs`

New non-browser defaults belong in `DEFAULT_TAB_APP_GROUPS` in `appRules.js`.
Add exact aliases only after checking the application's default Linux Ctrl+W
behavior; update `docs/default-apps.md` too. The preferences summary uses the
runtime catalog directly. Avoid broad name matches and do not populate the
user's override lists with built-in defaults.

For a repository update, replace the corresponding extension files with the
contents of this ZIP, preserving the repository's existing directory layout.
Keep unrelated repository files and `.git` intact. Review the changes before
committing. See `CHANGELOG.md` for release notes.

## Logs

`journalctl --user -b --no-pager | rg -i -C 5 'Mac-like Shortcuts'`

## Uninstall

`gnome-extensions disable mac-like-shortcuts@local`

`gnome-extensions uninstall mac-like-shortcuts@local`
