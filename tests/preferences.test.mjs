import test from 'node:test';
import assert from 'node:assert/strict';
import {rules, preferences} from './helpers.mjs';

test('new defaults are displayed as Automatic (tab), other apps as Automatic (window)', () => {
    const h = preferences();
    for (const name of ['Visual Studio Code', 'Files', 'Custom Zed launcher']) {
        const row = h.find(name);
        assert.equal(row.model[0], 'Automatic (tab)', name);
        assert.equal(row.selected, 0);
    }
    assert.equal(h.find('Calculator').model[0], 'Automatic (window)');
});

test('built-in defaults summary comes from the runtime app catalog', () => {
    const h = preferences();
    assert.ok(h.find('Built-in tab-closing apps'));
    for (const group of rules.DEFAULT_TAB_APP_GROUPS) {
        assert.equal(h.find(group.title).subtitle, group.apps.map(app => app.name).join(', '));
    }
});

test('opening preferences does not save defaults into override lists', () => {
    const h = preferences();
    assert.equal(h.settings.writes.length, 0);
    assert.deepEqual(h.settings.get_strv('tab-close-apps'), []);
    assert.deepEqual(h.settings.get_strv('window-close-apps'), []);
});

test('previously saved Close window choices remain selected for new defaults', () => {
    const h = preferences({'window-close-apps': ['CODE.desktop']});
    assert.equal(h.find('Visual Studio Code').selected, 2);
    assert.equal(h.settings.writes.length, 0);
});

test('selecting Close window sets the override and removes a conflicting tab rule', () => {
    const h = preferences({'tab-close-apps': ['CODE.desktop', 'custom-app']});
    h.find('Visual Studio Code').selected = 2;
    assert.deepEqual(h.settings.get_strv('tab-close-apps'), ['custom-app']);
    assert.deepEqual(h.settings.get_strv('window-close-apps'), ['code.desktop']);
});

test('selecting Automatic removes an override, restoring the updated defaults', () => {
    const h = preferences({'window-close-apps': ['code.desktop']});
    h.find('Visual Studio Code').selected = 0;
    assert.deepEqual(h.settings.get_strv('window-close-apps'), []);
    assert.equal(h.find('Visual Studio Code').model[0], 'Automatic (tab)');
});

test('reset apps clears app choices but preserves custom keyboard shortcuts', () => {
    const h = preferences({
        'close-item': ['<Super>w'], 'quit-app': ['<Super>q'],
        'tab-close-apps': ['custom-app'], 'window-close-apps': ['code.desktop'],
    });
    h.find('Reset apps').emit('clicked');
    assert.deepEqual(h.settings.get_strv('tab-close-apps'), []);
    assert.deepEqual(h.settings.get_strv('window-close-apps'), []);
    assert.deepEqual(h.settings.get_strv('close-item'), ['<Super>w']);
    assert.deepEqual(h.settings.get_strv('quit-app'), ['<Super>q']);
    assert.equal(h.find('Visual Studio Code').selected, 0);
});

test('manually adding an unknown identifier still works', () => {
    const h = preferences();
    const entry = h.find('App ID or WM_CLASS');
    entry.text = ' my-special-editor.desktop ';
    entry.emit('entry-activated');
    assert.deepEqual(h.settings.get_strv('tab-close-apps'), ['my-special-editor.desktop']);
    assert.equal(h.find('my-special-editor.desktop').selected, 1);
});

test('invalid manual paths are rejected without changing settings', () => {
    const h = preferences();
    const entry = h.find('App ID or WM_CLASS');
    entry.text = '/usr/bin/code'; entry.emit('entry-activated');
    assert.equal(h.settings.writes.length, 0);
    assert.ok(h.window.lastToast);
});

test('empty installed-app lists remain usable', () => {
    const h = preferences({}, []);
    assert.ok(h.find('No installed applications found'));
    assert.ok(h.find('Built-in tab-closing apps'));
});

test('closing preferences disconnects settings listeners', () => {
    const h = preferences();
    h.window.emit('close-request');
    assert.equal(h.settings.signals.size, 0);
});
