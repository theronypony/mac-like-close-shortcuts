# Mac-like Close and Quit v4 (GNOME Shell 50 / 51)

GNOME Shell extension for Ubuntu 26.04 (GNOME 50) and Ubuntu 26.10 (GNOME 51),
including Wayland sessions. No Window Control extension or external program is needed.

## Default behavior

- **Ctrl+W** on recognized browsers (Firefox, Chrome, Chromium, Brave, Edge,
  Vivaldi, Opera, GNOME Web, etc.): **native browser behavior**, directly and
  immediately. The extension temporarily unregisters its own Ctrl+W shortcut
  when a browser has focus, so tab-close is handled by the browser itself.
- **Ctrl+W** on other apps: politely close the focused window.
- **Ctrl+Q**: request that the focused application quit, including its windows.
  GNOME's app API allows the application to ask about unsaved work.

### Fix over v3

v3 delayed simulated Ctrl+W events in all browsers and temporarily removed its
binding for 160ms, resulting in missed rapid keypresses. v4 no longer intercepts
or injects Ctrl+W when Ctrl+W is configured and a recognized browser is focused.
Instead it switches the global binding on or off as window focus changes.

If you configure **another shortcut** (e.g., Super+W), this alternate shortcut
still needs synthetic Ctrl+W in browsers (a small delay may remain). Ctrl+W is
recommended for zero-delay browser behavior. Shortcuts can be changed in
Preferences, which also has a Reset button.

## Install or upgrade

    gnome-extensions disable mac-like-shortcuts@local
    gnome-extensions install --force ~/Downloads/mac-like-shortcuts-v4.zip

Log out and log back in so GNOME Shell loads the new code, then:

    gnome-extensions enable mac-like-shortcuts@local
    gnome-extensions show mac-like-shortcuts@local
    gnome-extensions prefs mac-like-shortcuts@local

Look for `State: ACTIVE`. GNOME keyboard settings must not also assign Ctrl+W to
its *Close Window* action. Avoid other extension bindings that capture Ctrl+W.

GNOME stores custom shortcut settings across extension upgrades. If old bindings
are still active, open Preferences and click Reset.

## Technical limitations

- The browser list is based on desktop app ID and WM_CLASS. Unrecognized browser
  instances are treated as ordinary windows until listed in the code.
- Native browser Ctrl+W may itself display a warning if closing the last tab
  or when the browser's settings/customizations require a confirmation.
- Outside recognized browsers, Ctrl+W overrides apps' own Ctrl+W tab/document
  shortcut and closes the entire focused window. That matches the v3 behavior.
- A custom close shortcut other than Ctrl+W uses simulated Ctrl+W in browsers,
  which can be imperfect under Wayland.
- Quit requests are graceful and can be refused; some apps keep background
  processes running after all windows have closed.
- This package was checked for JS syntax, metadata and ZIP integrity, but was
  not tested in a live GNOME desktop session.

### Logs

    journalctl --user -b --no-pager | grep -i -C 5 'Mac-like Shortcuts'

### Uninstall

    gnome-extensions disable mac-like-shortcuts@local
    gnome-extensions uninstall mac-like-shortcuts@local
