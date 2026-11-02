# Mac-like Close and Quit v5

GNOME Shell extension with configurable close and quit shortcuts. This package
keeps the GNOME Shell 50 / 51 targets from v4, including Wayland sessions.

## New in v5

- **Sublime Text now uses native Ctrl+W by default**, along with recognized
  browsers. The extension lets the app handle its own tab or document closing.
- **Preferences → App behavior** lets you choose Automatic, Close tab, or
  Close window for each installed app. The search button finds apps by name or ID.
- **Manual app identifiers** support portable apps, unusual launchers, and apps
  missing from the installed-app list. No JavaScript editing is required.
- App choices take effect immediately and persist across logins and upgrades.
- Pending simulated shortcuts are cancelled when focus or relevant settings
  change, so an old queued action is not sent after switching apps.

## Default behavior

| Shortcut / app | Behavior |
| --- | --- |
| Ctrl+W in a recognized browser | Native Ctrl+W, handled directly by the browser. |
| Ctrl+W in Sublime Text | Native Ctrl+W, handled directly by Sublime Text. |
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

Save the updated download as `mac-like-shortcuts-v5.zip` in `~/Downloads`.
The archive includes its freshly compiled settings schema and is ready to install.

1. Disable the currently installed extension:

   `gnome-extensions disable mac-like-shortcuts@local`

2. Install the update:

   `gnome-extensions install --force ~/Downloads/mac-like-shortcuts-v5.zip`

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
| Automatic (tab) / Automatic (window) | Use built-in detection: browsers and Sublime Text close tabs; other apps close the focused window. |
| Close tab | Let the app handle Ctrl+W for its native tab or document closing. |
| Close window | Request closure of the focused window, even for a browser or Sublime Text. |

For example, set a tabbed file manager or editor to **Close tab** if it already
supports Ctrl+W for closing a tab. Choose **Automatic** to remove that app's
explicit override.

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

Both lists default to empty; automatic browser and Sublime Text detection still
applies. The precedence is Close window override, then Close tab override, then
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
- JavaScript syntax, 14 runtime checks, 8 preferences checks, settings defaults,
  and ZIP integrity were checked. The settings schema was compiled with GLib's
  strict validation. Automated runtime/preferences checks use mocked GNOME APIs;
  this package has **not been tested in a live GNOME Shell desktop session**.

## Logs

`journalctl --user -b --no-pager | rg -i -C 5 'Mac-like Shortcuts'`

## Uninstall

`gnome-extensions disable mac-like-shortcuts@local`

`gnome-extensions uninstall mac-like-shortcuts@local`
