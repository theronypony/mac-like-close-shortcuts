import test from 'node:test';
import assert from 'node:assert/strict';
import {rules, read} from './helpers.mjs';

const {DEFAULT_TAB_APP_GROUPS, normalizeAppId, isDefaultTabApp, usesTabClose} = rules;
const apps = DEFAULT_TAB_APP_GROUPS.flatMap(group => group.apps);

test('catalog has unique, normalized, nonempty exact aliases', () => {
    const all = apps.flatMap(app => app.ids);
    assert.equal(new Set(all).size, all.length);
    assert.equal(new Set(apps.map(app => app.name)).size, apps.length);
    for (const id of all) {
        assert.ok(id);
        assert.equal(normalizeAppId(id), id);
        assert.ok(!/[/*\\\s]/.test(id));
    }
});

for (const app of apps) {
    test(`${app.name}: every listed alias gets native tab closing`, () => {
        for (const id of app.ids) {
            for (const variant of [id, `${id}.desktop`, ` ${id.toUpperCase()}.DESKTOP `]) {
                assert.equal(isDefaultTabApp([variant]), true, variant);
                assert.equal(usesTabClose([variant]), true, variant);
                assert.equal(usesTabClose([variant], [], [id]), false, `${variant}: window override`);
            }
        }
    });
}

test('browser rules from v5 remain recognized', () => {
    for (const id of ['firefox', 'firefox_firefox.desktop', 'org.mozilla.firefox.desktop',
        'google-chrome', 'google-chrome-beta', 'chromium', 'chromium_chromium',
        'com.google.Chrome', 'brave-browser', 'com.brave.Browser',
        'microsoft-edge', 'com.microsoft.Edge', 'vivaldi-stable', 'opera',
        'org.gnome.Epiphany', 'librewolf', 'waterfox', 'floorp', 'zen-browser',
        'app.zen_browser.zen', 'tor-browser', 'torbrowser-launcher', 'duckduckgo']) {
        assert.equal(isDefaultTabApp([id]), true, id);
    }
});

test('terminals and incompatible editor keymaps are not automatic tab apps', () => {
    for (const id of ['org.gnome.Terminal', 'gnome-terminal-server', 'org.gnome.Console',
        'org.gnome.Ptyxis', 'org.kde.konsole', 'kitty', 'Alacritty', 'wezterm',
        'com.mitchellh.ghostty', 'com.jetbrains.IntelliJ-IDEA-Community',
        'jetbrains-idea', 'jetbrains-pycharm', 'jetbrains-clion', 'jetbrains-webstorm',
        'emacs', 'org.gnu.Emacs', 'gvim', 'neovide', 'codeblocks', 'sublime_merge']) {
        assert.equal(isDefaultTabApp([id]), false, id);
    }
});

test('generic fragments and similar unrelated names never match the new defaults', () => {
    for (const id of ['editor', 'text', 'files', 'visual-studio', 'code-helper',
        'my-code-editor', 'codeblocks', 'decode', 'org.example.code',
        'kate-tools', 'geany-helper', 'nemo-desktop', 'thunderbird-helper',
        'org.example.org.gnome.TextEditor', '/usr/bin/code', 'unknown.desktop']) {
        assert.equal(isDefaultTabApp([id]), false, id);
    }
});

test('normalization accepts case/suffix/whitespace but rejects nonstrings', () => {
    assert.equal(normalizeAppId('  Org.Gnome.TextEditor.DESKTOP '), 'org.gnome.texteditor');
    for (const value of [null, undefined, 42, {}, '  ']) assert.equal(normalizeAppId(value), '');
    assert.equal(isDefaultTabApp(), false);
    assert.equal(isDefaultTabApp([null, undefined, '']), false);
});

test('desktop ID, WM_CLASS, or WM_CLASS instance can identify an app', () => {
    assert.equal(usesTabClose(['unknown.desktop', 'Code', 'unknown']), true);
    assert.equal(usesTabClose([null, null, 'org.gnome.Nautilus']), true);
});

test('manual tab override enables an unknown application', () => {
    assert.equal(usesTabClose(['my-app.desktop'], [' MY-APP ']), true);
});

test('window override wins across conflicting app aliases', () => {
    assert.equal(usesTabClose(['code.desktop', 'Code'], ['code'], ['CODE.DESKTOP']), false);
    assert.equal(usesTabClose(['com.visualstudio.code.desktop', 'Code'],
        ['com.visualstudio.code'], ['code']), false);
    assert.equal(usesTabClose(['com.visualstudio.code.desktop', 'Code'],
        ['code'], ['com.visualstudio.code']), false);
});

test('unrelated overrides do not affect an application', () => {
    assert.equal(usesTabClose(['code.desktop'], [], ['codium.desktop']), true);
    assert.equal(usesTabClose(['calculator.desktop'], ['code.desktop']), false);
});

test('empty identifiers cannot match empty override entries', () => {
    assert.equal(usesTabClose([null, '', undefined], [' ', '']), false);
});

test('rule evaluation never mutates user settings or identifiers', () => {
    const ids = Object.freeze(['code.desktop', 'Code']);
    const tabs = Object.freeze(['other-app.desktop']);
    const windows = Object.freeze(['CODE.DESKTOP']);
    assert.equal(usesTabClose(ids, tabs, windows), false);
});

test('documented app catalog includes every configured alias', () => {
    const docs = read('docs/default-apps.md');
    for (const app of apps) {
        assert.ok(docs.includes(app.name), app.name);
        for (const id of app.ids) assert.ok(docs.includes(`\`${id}\``), id);
    }
});
