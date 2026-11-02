# Built-in tab-closing defaults

The runtime catalog in `appRules.js` is also used by the preferences summary.
All IDs below match exactly, ignoring case and an optional `.desktop` suffix.
A known desktop ID, WM_CLASS, or WM_CLASS instance is sufficient.

Browser detection is unchanged from v5. It recognizes Firefox, Chrome, Chromium,
Brave, Edge, Vivaldi, Opera, GNOME Web, LibreWolf, Waterfox, Floorp, Zen,
Tor Browser, and DuckDuckGo through the existing browser-token rule.

## Text and code editors

| App | Recognized identifiers |
| --- | --- |
| Sublime Text | `sublime_text`, `sublime-text`, `sublimetext`, `sublime_text_3`, `sublime-text-3`, `sublime-text-4`, `sublime-text_subl`, `subl`, `com.sublimetext.three`, `com.sublimetext.four` |
| Visual Studio Code / Insiders | `code`, `code-insiders`, `visual-studio-code`, `com.visualstudio.code`, `com.visualstudio.code.insiders`, `code_code`, `code-insiders_code-insiders` |
| VSCodium / Insiders | `codium`, `vscodium`, `codium-insiders`, `vscodium-insiders`, `com.vscodium.codium`, `com.vscodium.codium-insiders`, `codium_codium`, `codium-insiders_codium-insiders` |
| Code - OSS | `code-oss`, `code-oss_code-oss` |
| Cursor | `cursor`, `cursor_cursor` |
| Zed | `zed`, `zed-editor`, `dev.zed.zed`, `dev.zed.zed-preview`, `dev.zed.zed-nightly` |
| GNOME Text Editor | `gnome-text-editor`, `org.gnome.texteditor`, `org.gnome.texteditor.devel` |
| gedit | `gedit`, `org.gnome.gedit` |
| Kate | `kate`, `org.kde.kate`, `kate_kate` |
| KWrite | `kwrite`, `org.kde.kwrite` |
| Geany | `geany`, `org.geany.geany` |
| Mousepad | `mousepad`, `org.xfce.mousepad` |
| Xed | `xed` |
| Pluma | `pluma`, `org.mate.pluma` |

## File managers

| App | Recognized identifiers |
| --- | --- |
| GNOME Files (Nautilus) | `nautilus`, `org.gnome.nautilus`, `org.gnome.nautilusdevel` |
| Dolphin | `dolphin`, `org.kde.dolphin` |
| Nemo | `nemo` |
| Thunar | `thunar`, `org.xfce.thunar` |
| Caja | `caja`, `org.mate.caja` |
| PCManFM | `pcmanfm` |
| PCManFM-Qt | `pcmanfm-qt` |

## Notes, documents and images

| App | Recognized identifiers |
| --- | --- |
| Obsidian | `obsidian`, `md.obsidian.obsidian`, `obsidian_obsidian` |
| Okular | `okular`, `org.kde.okular` |
| GIMP | `gimp`, `gimp-2.10`, `gimp-3.0`, `gimp-3.2`, `org.gimp.gimp`, `gimp_gimp` |
| Thunderbird | `thunderbird`, `org.mozilla.thunderbird`, `thunderbird_thunderbird` |

## Selection policy

Automatic tab closing is an explicit allowlist of apps whose usual Linux keymap
uses Ctrl+W for closing the active tab, document, image, or view. It is not a
general test for whether an app has tabs. Exact aliases avoid confusing Code
with Code::Blocks or Sublime Text with Sublime Merge. The existing browser
token matcher is retained for backward compatibility.

Standalone terminals, JetBrains IDEs, Emacs and Vim are not added: their usual
Ctrl+W actions differ. Their previous window-close default is unchanged. A
manual Close tab rule only passes through Ctrl+W; it does not translate it into
Ctrl+Shift+W, Ctrl+F4, or another app-specific shortcut.

User keymaps, editor modes, plugins, embedded terminals, pinned tabs and dialog
focus may alter native Ctrl+W behavior. The app remains in charge, including
save prompts and whether closing its last tab closes a window. Package aliases
are not an exhaustive inventory of every distribution or launcher. Add an
unrecognized identifier manually in Preferences.

Defaults are not copied into either GSettings override list. Existing choices
survive upgrades. Precedence remains: Close window, then Close tab, then
Automatic. Reset apps clears overrides and restores this catalog.

## Reference material

Documentation and upstream source informed the defaults; these are not claims
that each packaged application was installed and tested in a desktop session.

- [VS Code default Linux keybindings](https://code.visualstudio.com/docs/reference/default-keybindings)
  and [Cursor's VS Code keybinding baseline](https://cursor.com/docs/reference/keyboard-shortcuts).
- [Zed Linux keymap](https://github.com/zed-industries/zed/blob/main/assets/keymaps/default-linux.json).
- [GNOME Text Editor window bindings](https://github.com/GNOME/gnome-text-editor/blob/main/src/editor-window.c)
  and [GNOME Files window bindings](https://github.com/GNOME/nautilus/blob/master/src/nautilus-window.c).
- [Kate shortcuts](https://docs.kde.org/trunk_kf6/en/kate/kate/working-with-kate.html),
  [KDE standard shortcuts](https://docs.kde.org/trunk_kf6/en/khelpcenter/fundamentals/kbd.html),
  [Dolphin commands](https://docs.kde.org/stable_kf6/en/dolphin/dolphin/command-reference.html),
  and [Okular's standard close action](https://github.com/KDE/okular/blob/master/shell/shell.cpp).
- [Geany keybindings](https://github.com/geany/geany/blob/master/src/keybindings.c),
  [Mousepad accelerators](https://github.com/xfce-mirror/mousepad/blob/master/mousepad/mousepad-application.c),
  and [Xed close actions](https://github.com/linuxmint/xed/blob/master/xed/xed-ui.h).
- [Nemo close action](https://github.com/linuxmint/nemo/blob/master/src/nemo-window-menus.c),
  [Thunar close-tab action](https://github.com/xfce-mirror/thunar/blob/master/thunar/thunar-window.c),
  [Caja close action](https://github.com/mate-desktop/caja/blob/master/src/caja-window-menus.c),
  [PCManFM shortcuts](https://github.com/lxde/pcmanfm/blob/master/src/main-win-ui.c),
  and [PCManFM-Qt shortcuts](https://github.com/lxqt/pcmanfm-qt/blob/master/pcmanfm/main-win.ui).
- [GIMP Close View](https://docs.gimp.org/3.0/en/gimp-file-close.html),
  [Thunderbird shortcuts](https://support.mozilla.org/en-US/kb/keyboard-shortcuts-thunderbird),
  and [Obsidian tabs](https://obsidian.md/help/tabs).
- Exclusion references: [GNOME Terminal tab closing uses Ctrl+Shift+W](https://help.gnome.org/gnome-terminal/gs-tabs.html)
  and [JetBrains Ctrl+W selection behavior](https://www.jetbrains.com/help/idea/mastering-keyboard-shortcuts.html).
- [GNOME Shell restart requirements](https://gjs.guide/extensions/development/debugging.html).
