// App matching is shared by GNOME Shell and the preferences window.
// Keep this module free of GI imports so the rules can be tested separately.

// Preserve the built-in browser detection from v4/v5.
const BROWSER_TOKEN = /(?:^|[._-])(?:firefox|librewolf|waterfox|floorp|zen-browser|zen|chromium|google-chrome|chrome|brave-browser|brave|microsoft-edge|edge|vivaldi|opera|epiphany|tor-browser|torbrowser|duckduckgo)(?:[._-]|$)/i;

// Curated defaults, not a heuristic for every application that has tabs.
// These apps normally use Ctrl+W to close the active tab, document or image.
// In particular, do NOT add terminals, JetBrains IDEs, Emacs or Vim simply
// because they have tabs: Ctrl+W has a different meaning in those apps.
//
// Use exact desktop IDs / WM_CLASS aliases. Never match a generic fragment
// such as "code", "text", "editor" or "file" inside another app's ID.
// Native, Flatpak and selected Snap aliases are listed explicitly. Unknown
// packaging variants can still be configured in Preferences > App behavior.
// Keep names and IDs together so the preferences summary cannot drift away
// from the actual matching rules. See docs/default-apps.md for the full list.
export const DEFAULT_TAB_APP_GROUPS = [
    {
        title: 'Text and code editors',
        apps: [
            {name: 'Sublime Text', ids: [
                'sublime_text', 'sublime-text', 'sublimetext', 'sublime_text_3',
                'sublime-text-3', 'sublime-text-4', 'sublime-text_subl', 'subl',
                'com.sublimetext.three', 'com.sublimetext.four',
            ]},
            {name: 'Visual Studio Code / Insiders', ids: [
                'code', 'code-insiders', 'visual-studio-code',
                'com.visualstudio.code', 'com.visualstudio.code.insiders',
                'code_code', 'code-insiders_code-insiders',
            ]},
            {name: 'VSCodium / Insiders', ids: [
                'codium', 'vscodium', 'codium-insiders', 'vscodium-insiders',
                'com.vscodium.codium', 'com.vscodium.codium-insiders',
                'codium_codium', 'codium-insiders_codium-insiders',
            ]},
            {name: 'Code - OSS', ids: ['code-oss', 'code-oss_code-oss']},
            {name: 'Cursor', ids: ['cursor', 'cursor_cursor']},
            {name: 'Zed', ids: [
                'zed', 'zed-editor', 'dev.zed.zed',
                'dev.zed.zed-preview', 'dev.zed.zed-nightly',
            ]},
            {name: 'GNOME Text Editor', ids: [
                'gnome-text-editor', 'org.gnome.texteditor',
                'org.gnome.texteditor.devel',
            ]},
            {name: 'gedit', ids: ['gedit', 'org.gnome.gedit']},
            {name: 'Kate', ids: ['kate', 'org.kde.kate', 'kate_kate']},
            {name: 'KWrite', ids: ['kwrite', 'org.kde.kwrite']},
            {name: 'Geany', ids: ['geany', 'org.geany.geany']},
            {name: 'Mousepad', ids: ['mousepad', 'org.xfce.mousepad']},
            {name: 'Xed', ids: ['xed']},
            {name: 'Pluma', ids: ['pluma', 'org.mate.pluma']},
        ],
    },
    {
        title: 'File managers',
        apps: [
            {name: 'GNOME Files (Nautilus)', ids: [
                'nautilus', 'org.gnome.nautilus', 'org.gnome.nautilusdevel',
            ]},
            {name: 'Dolphin', ids: ['dolphin', 'org.kde.dolphin']},
            {name: 'Nemo', ids: ['nemo']},
            {name: 'Thunar', ids: ['thunar', 'org.xfce.thunar']},
            {name: 'Caja', ids: ['caja', 'org.mate.caja']},
            {name: 'PCManFM', ids: ['pcmanfm']},
            {name: 'PCManFM-Qt', ids: ['pcmanfm-qt']},
        ],
    },
    {
        title: 'Notes, documents and images',
        apps: [
            {name: 'Obsidian', ids: [
                'obsidian', 'md.obsidian.obsidian', 'obsidian_obsidian',
            ]},
            {name: 'Okular', ids: ['okular', 'org.kde.okular']},
            {name: 'GIMP', ids: [
                'gimp', 'gimp-2.10', 'gimp-3.0', 'gimp-3.2',
                'org.gimp.gimp', 'gimp_gimp',
            ]},
            {name: 'Thunderbird', ids: [
                'thunderbird', 'org.mozilla.thunderbird',
                'thunderbird_thunderbird',
            ]},
        ],
    },
];

const DEFAULT_TAB_APP_IDS = new Set(DEFAULT_TAB_APP_GROUPS.flatMap(group =>
    group.apps.flatMap(app => app.ids.map(normalizeAppId))));

export function normalizeAppId(value) {
    return typeof value === 'string'
        ? value.trim().toLowerCase().replace(/\.desktop$/, '')
        : '';
}

export function isDefaultTabApp(identifiers = []) {
    return identifiers.some(value => {
        const id = normalizeAppId(value);
        return id && (BROWSER_TOKEN.test(id) || DEFAULT_TAB_APP_IDS.has(id));
    });
}

export function usesTabClose(identifiers = [], tabCloseApps = [], windowCloseApps = []) {
    const ids = new Set(identifiers.map(normalizeAppId).filter(Boolean));
    const matches = rules => rules.some(value => {
        const id = normalizeAppId(value);
        return id && ids.has(id);
    });

    // Check every alias before applying precedence: a window rule on an app's
    // WM_CLASS must win even when its desktop ID has a tab rule. Defaults are
    // NOT written into GSettings, so upgrades never overwrite user choices.
    if (matches(windowCloseApps))
        return false;
    if (matches(tabCloseApps))
        return true;
    return isDefaultTabApp([...ids]);
}
