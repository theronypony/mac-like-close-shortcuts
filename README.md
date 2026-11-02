Mac-like Close and Quit
GNOME Shell extension for configurable close and quit keyboard shortcuts on
GNOME Shell 50 and 51, including Wayland sessions.
Features
- Ctrl+W closes the active tab or document in recognized browsers and supported applications.
- Ctrl+W requests window closure in other applications.
- Ctrl+Q requests that the focused application quit.
- Per-application preferences let you choose Automatic, Close tab, or Close window.
- Search installed applications, add custom application identifiers, and reset overrides.
- Configure close and quit shortcuts from Preferences.
Built-in tab-closing applications
Category	Applications
Browsers	Firefox, Chrome, Chromium, Brave, Edge, Vivaldi, Opera, GNOME Web, and other recognized browsers.
Text and code editors	Sublime Text; Visual Studio Code / Insiders; VSCodium / Insiders; Code - OSS; Cursor; Zed; GNOME Text Editor; gedit; Kate; KWrite; Geany; Mousepad; Xed; Pluma.
File managers	GNOME Files (Nautilus); Dolphin; Nemo; Thunar; Caja; PCManFM; PCManFM-Qt.
Notes, documents, and images	Obsidian; Okular; GIMP; Thunderbird.


See [the application ID catalog](docs/default-apps.md) for recognized identifiers.
Default behavior
Shortcut / app	Behavior
Ctrl+W in a recognized browser	Native Ctrl+W, handled directly by the browser.
Ctrl+W in a built-in tab-based app	Native Ctrl+W, handled directly by that app.
Ctrl+W in other apps	Request that the focused window close.
Ctrl+Q	Request that the focused application quit, including its windows.


For tab-closing apps, the extension temporarily unregisters its global Ctrl+W
binding while that app has focus. Physical Ctrl+W goes straight to the app,
without a simulated key or extension-imposed delay. If you configure another
close shortcut, such as Super+W, the extension sends a best-effort simulated
Ctrl+W to those apps after you release the modifiers.
Installation
Download the extension ZIP to ~/Downloads. The archive includes the compiled settings schema.
1. Disable the currently installed extension:
   gnome-extensions disable mac-like-shortcuts@local
2. Install the extension (replace EXTENSION.zip with the downloaded filename):
   gnome-extensions install --force ~/Downloads/EXTENSION.zip
3. Log out and log back in so GNOME Shell loads the new code and settings schema.
4. Enable the extension:
   gnome-extensions enable mac-like-shortcuts@local
5. Open its preferences:
   gnome-extensions prefs mac-like-shortcuts@local
To inspect its status:

gnome-extensions show mac-like-shortcuts@local

Use the Keyboard shortcuts page to customize the bindings. GNOME's own Close Window shortcut and other extensions must not
also capture the same keys.
Choose which apps close tabs
Open Preferences → App behavior. Under Installed applications, find the
app or use the search button, then choose its behavior:
Choice	Result
Automatic (tab) / Automatic (window)	Use built-in detection: browsers and the apps listed above handle Ctrl+W; other apps close the focused window.
Close tab	Let the app handle Ctrl+W for its native tab or document closing.
Close window	Request closure of the focused window, even for a browser or another built-in tab-based app.


Set an unlisted tabbed app to Close tab if it already supports Ctrl+W for
closing a tab. Choose Automatic to remove that app's explicit override and
use built-in defaults. Expand Built-in tab-closing apps to review the catalog.

Reset apps clears all app overrides. The separate Reset button on the
Keyboard shortcuts page restores Ctrl+W and Ctrl+Q without clearing app choices.
Add an app manually
In Add an app manually, enter one desktop application ID or WM_CLASS and
click Add, or press Enter. This enables Close tab for that identifier.
Change it to Close window in its row if desired. The remove button restores
automatic behavior for a custom identifier.

Examples of identifiers:
- org.gnome.TextEditor.desktop
- code.desktop
- sublime_text
These are examples of app identifiers, not executable paths. Matching checks
the focused window's desktop application ID, WM_CLASS, and WM_CLASS instance.
Custom rules match exactly, ignoring surrounding whitespace, letter case, and
an optional trailing .desktop. For example, Code.desktop and code refer
to the same identifier. Wildcards and partial-name matching are not supported.

An app may expose multiple identifiers. If one matches a Close window rule and
another matches a Close tab rule, Close window wins. Remove a conflicting
custom identifier if an app's choice seems ineffective. A custom row set to
Automatic has no saved override and may disappear when preferences reopen.
Optional: set rules with GSettings
The GUI is the simplest way to maintain rules. Advanced users can inspect the
extension-local schema with an explicit schema directory:

gsettings --schemadir "$HOME/.local/share/gnome-shell/extensions/mac-like-shortcuts@local/schemas" get org.gnome.shell.extensions.mac-like-shortcuts tab-close-apps

Set the complete Close tab override list (this replaces the previous list):

gsettings --schemadir "$HOME/.local/share/gnome-shell/extensions/mac-like-shortcuts@local/schemas" set org.gnome.shell.extensions.mac-like-shortcuts tab-close-apps "['code.desktop', 'org.gnome.TextEditor.desktop']"

Set the complete Close window override list:

gsettings --schemadir "$HOME/.local/share/gnome-shell/extensions/mac-like-shortcuts@local/schemas" set org.gnome.shell.extensions.mac-like-shortcuts window-close-apps "['firefox.desktop']"

Both override lists default to empty; the built-in automatic detection still
applies. Default apps are kept in appRules.js, not written into these lists. The precedence is Close window override, then Close tab override, then
automatic detection.
Limits and verification
- Close tab uses the app's existing Ctrl+W behavior. The app must support
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
  automatic behavior is window closing. A manual Close tab rule only
  passes through Ctrl+W; it cannot remap Ctrl+W to Ctrl+Shift+W or Ctrl+F4.
- Native app keymaps, Vim/Emacs modes, plugins, embedded terminals, pinned tabs,
  and dialog focus can change what Ctrl+W does. The extension does not override
  those internal app behaviors.
Development and tests
The extension source includes documentation and headless tests. Node.js 18 or newer is needed only to run the tests, not to use the
extension. From the extracted source directory:

node --test tests/*.test.mjs

New non-browser defaults belong in DEFAULT_TAB_APP_GROUPS in appRules.js.
Add exact aliases only after checking the application's default Linux Ctrl+W
behavior; update docs/default-apps.md too. The preferences summary uses the
runtime catalog directly. Avoid broad name matches and do not populate the
user's override lists with built-in defaults.
Logs
journalctl --user -b --no-pager | rg -i -C 5 'Mac-like Shortcuts'
Uninstall
gnome-extensions disable mac-like-shortcuts@local

gnome-extensions uninstall mac-like-shortcuts@local
