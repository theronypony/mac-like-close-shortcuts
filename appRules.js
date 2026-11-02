// App matching is shared by GNOME Shell and the preferences window.
// Keep this module free of GI imports so the rules can be tested separately.

// Preserve the built-in browser detection from v4.
const BROWSER_TOKEN = /(?:^|[._-])(?:firefox|librewolf|waterfox|floorp|zen-browser|zen|chromium|google-chrome|chrome|brave-browser|brave|microsoft-edge|edge|vivaldi|opera|epiphany|tor-browser|torbrowser|duckduckgo)(?:[._-]|$)/i;

// Desktop IDs and WM_CLASS names used by native, Snap and Flatpak installs.
// Use exact aliases so Sublime Merge is not treated as Sublime Text.
const SUBLIME_TEXT_IDS = new Set([
    'sublime_text',
    'sublime-text',
    'sublimetext',
    'sublime_text_3',
    'sublime-text-3',
    'sublime-text-4',
    'sublime-text_subl',
    'subl',
    'com.sublimetext.three',
    'com.sublimetext.four',
]);

export function normalizeAppId(value) {
    return typeof value === 'string'
        ? value.trim().toLowerCase().replace(/\.desktop$/, '')
        : '';
}

export function isDefaultTabApp(identifiers = []) {
    return identifiers.some(value => {
        const id = normalizeAppId(value);
        return id && (BROWSER_TOKEN.test(id) || SUBLIME_TEXT_IDS.has(id));
    });
}

export function usesTabClose(identifiers = [], tabCloseApps = [], windowCloseApps = []) {
    const ids = new Set(identifiers.map(normalizeAppId).filter(Boolean));
    const matches = rules => rules.some(value => {
        const id = normalizeAppId(value);
        return id && ids.has(id);
    });

    // Check every alias before applying precedence: a window rule on an app's
    // WM_CLASS must win even when its desktop ID has a tab rule.
    if (matches(windowCloseApps))
        return false;
    if (matches(tabCloseApps))
        return true;
    return isDefaultTabApp([...ids]);
}
