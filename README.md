# Mac-like Close and Quit

GNOME Shell extension for GNOME 50 (Ubuntu 26.04) and GNOME 51 (Ubuntu 26.10).
Designed for Wayland; also usable with X11.

## Default shortcuts

- **Ctrl+W**: close the current browser tab in Firefox, Chrome, Chromium,
  Brave, Edge, Vivaldi, Opera, GNOME Web, Zen and several other browsers;
  in other apps, politely close the focused window.
- **Ctrl+Q**: ask the focused application to quit (all its windows), without
  force-killing the process. Applications can prompt to save changes.

Both shortcuts are configurable from the extension's **Preferences** window.
Click **Change…**, press the desired combination, then release it. **Esc**
cancels; **Backspace** alone disables an action. **Reset** restores Ctrl+W
and Ctrl+Q.

Note: These shortcuts are global: while enabled they override the same
key combinations inside other apps. For example, an editor's own Ctrl+W
"close tab" behavior is replaced by this extension's window-close action
unless it is in the recognized-browser list.

## Installation or upgrade

From your Downloads directory (adjust the path if necessary):

    gnome-extensions disable mac-like-shortcuts@local
    gnome-extensions install --force ~/Downloads/mac-like-shortcuts-v3.zip

**Log out and log back in**. Then:

    gnome-extensions enable mac-like-shortcuts@local
    gnome-extensions show mac-like-shortcuts@local
    gnome-extensions prefs mac-like-shortcuts@local

GNOME should report **State: ACTIVE**. The Preferences option also appears
for this extension in the GNOME Extensions app.

GNOME compiles bundled GSettings schemas automatically when installing
extensions. This package includes both XML and compiled schema files.

## How this avoids a Ctrl+W loop

GNOME globally captures Ctrl+W, so the browser wouldn't receive the normal
key combination. For browsers, the extension waits until physical modifiers
have been released, temporarily removes its close binding, sends a synthetic
Ctrl+W to the browser, and restores its binding after the input is processed.
This is a best-effort workaround for Wayland's compositor-controlled keys;
behavior may vary across browsers, GNOME releases, and keyboard layouts.

## Troubleshooting

If preferences are unavailable after updating, log out and back in before
running `gnome-extensions prefs mac-like-shortcuts@local`.

If bindings remain on older values, open Preferences and click **Reset**.

If shortcut recording was interrupted abnormally (for example, the
Preferences application crashed) and a shortcut became disabled, use
**Reset** in Preferences. You can also restore via the terminal:

    GSETTINGS_SCHEMA_DIR="$HOME/.local/share/gnome-shell/extensions/mac-like-shortcuts@local/schemas" \
      gsettings reset org.gnome.shell.extensions.mac-like-shortcuts close-item
    GSETTINGS_SCHEMA_DIR="$HOME/.local/share/gnome-shell/extensions/mac-like-shortcuts@local/schemas" \
      gsettings reset org.gnome.shell.extensions.mac-like-shortcuts quit-app

If another GNOME shortcut uses the same combination, remove that conflict
under GNOME Settings → Keyboard → Keyboard Shortcuts, or select another
combination in the extension's Preferences. If Ctrl+W is assigned to
GNOME's native Close Window shortcut, remove that assignment.

GNOME Shell logs:

    journalctl --user -b --no-pager | grep -i -C 5 'Mac-like Shortcuts'

## Safety and limitations

- No subprocesses, network access, `pkill`, `kill`, `xdotool`, or `wmctrl`.
- The app-quit operation makes a graceful request; an app may refuse or
  remain running in the background. Its save/quit prompts take precedence.
- The browser list is determined by app ID/WM_CLASS. Unrecognized browsers
  are treated as ordinary windows until added to the detection pattern.
- These bindings are active only during a normal GNOME desktop session.
- GNOME Shell APIs and syntax were checked, but live desktop behavior has
  not been tested in this build environment.

## Uninstall

    gnome-extensions disable mac-like-shortcuts@local
    gnome-extensions uninstall mac-like-shortcuts@local
# mac-like-close-shortcuts
