import test from 'node:test';
import assert from 'node:assert/strict';
import {rules, runtime, makeWindow} from './helpers.mjs';

test('all catalog apps bypass the global Ctrl+W binding without injecting keys', () => {
    for (const app of rules.DEFAULT_TAB_APP_GROUPS.flatMap(group => group.apps)) {
        const window = makeWindow(`${app.ids[0]}.desktop`);
        const h = runtime(window);
        h.extension.enable();
        assert.equal(h.bindings.has('close-item'), false, app.name);
        assert.equal(h.bindings.has('quit-app'), true, app.name);
        assert.equal(h.keys.length, 0);
        assert.equal(window.deleted, 0);
        h.extension.disable();
    }
});

test('focus changes switch between native tab closing and window closing', () => {
    const window = makeWindow('org.gnome.Calculator.desktop');
    const h = runtime(window);
    h.extension.enable();
    assert.ok(h.bindings.has('close-item'));
    h.focus(makeWindow('org.gnome.Nautilus.desktop'));
    assert.equal(h.bindings.has('close-item'), false);
    h.focus(window);
    h.bindings.get('close-item')();
    assert.equal(window.deleted, 1);
    h.extension.disable();
});

test('saved window override still forces window close for a newly recognized app', () => {
    const window = makeWindow('code.desktop');
    const h = runtime(window, {'window-close-apps': ['code.desktop']});
    h.extension.enable();
    h.bindings.get('close-item')();
    assert.equal(window.deleted, 1);
    assert.equal(h.keys.length, 0);
    assert.equal(h.settings.writes.length, 0);
    h.extension.disable();
});

test('changing or resetting app overrides refreshes the focused app immediately', () => {
    const h = runtime(makeWindow('org.gnome.Nautilus.desktop'));
    h.extension.enable();
    h.settings.set_strv('window-close-apps', ['org.gnome.Nautilus']);
    assert.ok(h.bindings.has('close-item'));
    h.settings.reset('window-close-apps');
    assert.equal(h.bindings.has('close-item'), false);
    h.focus(makeWindow('custom-app.desktop'));
    assert.ok(h.bindings.has('close-item'));
    h.settings.set_strv('tab-close-apps', ['custom-app']);
    assert.equal(h.bindings.has('close-item'), false);
    h.extension.disable();
});

test('WM_CLASS aliases work when the launcher has an unknown desktop ID', () => {
    const h = runtime(makeWindow('custom-launcher.desktop', 'Zed'));
    h.extension.enable();
    assert.equal(h.bindings.has('close-item'), false);
    h.extension.disable();
});

test('only plain Ctrl+W and Primary+W qualify for native passthrough', () => {
    for (const accelerator of ['<Control>w', '<Primary>w', '<Control>W', '<Super>w', '<Control><Shift>w']) {
        const h = runtime(makeWindow('code.desktop'), {'close-item': [accelerator]});
        h.extension.enable();
        assert.equal(h.bindings.has('close-item'), /Super|Shift/.test(accelerator), accelerator);
        h.extension.disable();
    }
});

test('a custom close shortcut waits for modifier release before sending Ctrl+W', () => {
    const h = runtime(makeWindow('code.desktop'), {'close-item': ['<Super>w']});
    h.extension.enable();
    h.state.modifiers = h.modifiers.SUPER_MASK;
    h.bindings.get('close-item')();
    h.tick();
    assert.equal(h.keys.length, 0);
    h.state.modifiers = 0;
    h.tick(); h.tick();
    assert.deepEqual(h.keys.map(key => key.slice(1)), [['Ctrl', 1], ['w', 1], ['w', 0], ['Ctrl', 0]]);
    h.extension.disable();
});

test('changing focus cancels a pending simulated close', () => {
    const h = runtime(makeWindow('code.desktop'), {'close-item': ['<Super>w']});
    h.extension.enable(); h.bindings.get('close-item')();
    assert.equal(h.timers.size, 1);
    h.focus(makeWindow('unknown.desktop'));
    h.tick(); h.tick();
    assert.equal(h.timers.size, 0);
    assert.equal(h.keys.length, 0);
    h.extension.disable();
});

test('changing app overrides cancels a pending simulated close', () => {
    const h = runtime(makeWindow('code.desktop'), {'close-item': ['<Super>w']});
    h.extension.enable(); h.bindings.get('close-item')();
    h.settings.set_strv('window-close-apps', ['code']);
    h.tick(); h.tick();
    assert.equal(h.keys.length, 0);
    assert.equal(h.timers.size, 0);
    h.extension.disable();
});

test('disabled shortcuts are not registered', () => {
    const h = runtime(makeWindow(), {'close-item': [], 'quit-app': []});
    h.extension.enable();
    assert.equal(h.bindings.size, 0);
    h.extension.disable();
});

test('Ctrl+Q remains a graceful application quit action', () => {
    const window = makeWindow('code.desktop');
    let quitRequested = 0;
    window.app.request_quit = () => { quitRequested++; return true; };
    const h = runtime(window);
    h.extension.enable(); h.bindings.get('quit-app')();
    assert.equal(quitRequested, 1);
    assert.equal(window.deleted, 0);
    h.extension.disable();
});

test('disable removes bindings, listeners and pending timers', () => {
    const h = runtime(makeWindow('code.desktop'), {'close-item': ['<Super>w']});
    h.extension.enable(); h.bindings.get('close-item')();
    h.extension.disable();
    assert.equal(h.bindings.size, 0);
    assert.equal(h.display.signals.size, 0);
    assert.equal(h.settings.signals.size, 0);
    assert.equal(h.timers.size, 0);
});
