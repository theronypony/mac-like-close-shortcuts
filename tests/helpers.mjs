// Headless test doubles. These do not emulate a live GNOME desktop.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

export const root = new URL('../', import.meta.url);
export const read = path => readFileSync(new URL(path, root), 'utf8');
export const rules = await import(`data:text/javascript;base64,${Buffer.from(read('appRules.js')).toString('base64')}`);

export class Signals {
    constructor() { this.signals = new Map(); this.nextSignal = 1; }
    connect(name, callback) {
        const id = this.nextSignal++;
        this.signals.set(id, {name, callback});
        return id;
    }
    disconnect(id) { this.signals.delete(id); }
    emit(name, ...args) {
        for (const signal of [...this.signals.values()]) {
            if (signal.name === name)
                signal.callback(this, ...args);
        }
    }
}

export class Settings extends Signals {
    constructor(values = {}) {
        super();
        this.defaults = {
            'close-item': ['<Control>w'], 'quit-app': ['<Control>q'],
            'tab-close-apps': [], 'window-close-apps': [],
        };
        this.values = {...this.defaults, ...values};
        this.writes = [];
    }
    get_strv(key) { return [...this.values[key]]; }
    set_strv(key, value) {
        this.values[key] = [...value];
        this.writes.push([key, [...value]]);
        this.emit(`changed::${key}`);
    }
    reset(key) { this.set_strv(key, this.defaults[key]); }
}

function loadClass(path, globals, className) {
    const source = read(path).replace(/^import .*;\n/gm, '')
        .replace(`export default class ${className}`, `class ${className}`);
    const context = vm.createContext({...globals, console});
    vm.runInContext(`${source}\nglobalThis.ResultClass = ${className};`, context, {filename: path});
    return context.ResultClass;
}

export function makeWindow(appId = 'unknown.desktop', wmClass = null, instance = null) {
    const window = {
        deleted: 0,
        get_wm_class: () => wmClass,
        get_wm_class_instance: () => instance,
        can_close: () => true,
        delete() { this.deleted++; },
    };
    window.app = {
        get_id: () => appId,
        request_quit: () => false,
        get_windows: () => [window],
    };
    return window;
}

export function runtime(window = makeWindow(), initialSettings = {}) {
    const settings = new Settings(initialSettings);
    const display = new Signals();
    const state = {window, modifiers: 0, now: 1_000_000};
    const bindings = new Map();
    const timers = new Map();
    const keys = [];
    let nextTimer = 1;
    const modifiers = Object.fromEntries(['SHIFT_MASK', 'CONTROL_MASK', 'MOD1_MASK',
        'MOD4_MASK', 'SUPER_MASK', 'META_MASK', 'HYPER_MASK'].map((name, i) => [name, 1 << i]));
    display.get_focus_window = () => state.window;
    const global = {
        display, get_current_time: () => 123,
        get_pointer: () => [0, 0, state.modifiers],
        stage: {context: {get_backend: () => ({get_default_seat: () => ({
            create_virtual_device: () => ({notify_keyval: (...args) => keys.push(args)}),
        })})}},
    };
    const Extension = class { getSettings() { return settings; } };
    const ExtensionClass = loadClass('extension.js', {
        Extension, global, usesTabClose: rules.usesTabClose,
        Clutter: {
            ModifierType: modifiers, KEY_Control_L: 'Ctrl', KEY_w: 'w',
            KeyState: {PRESSED: 1, RELEASED: 0}, InputDeviceType: {KEYBOARD_DEVICE: 1},
        },
        GLib: {
            PRIORITY_DEFAULT: 0, SOURCE_REMOVE: false, SOURCE_CONTINUE: true,
            get_monotonic_time: () => state.now,
            timeout_add: (_priority, _interval, callback) => {
                const id = nextTimer++; timers.set(id, callback); return id;
            },
            Source: {remove: id => timers.delete(id)},
        },
        Meta: {KeyBindingFlags: {IGNORE_AUTOREPEAT: 1}, KeyBindingAction: {NONE: 0}},
        Shell: {ActionMode: {NORMAL: 1}, WindowTracker: {get_default: () => ({
            get_window_app: candidate => candidate.app,
        })}},
        Main: {wm: {
            addKeybinding: (key, _settings, _flags, _mode, callback) => {
                bindings.set(key, callback); return 1;
            },
            removeKeybinding: key => bindings.delete(key),
        }},
    }, 'MacLikeShortcuts');
    const extension = new ExtensionClass();
    return {
        extension, settings, state, display, bindings, timers, keys, modifiers,
        focus(candidate) {
            state.window = candidate; display.emit('notify::focus-window');
        },
        tick(microseconds = 50_000) {
            state.now += microseconds;
            for (const [id, callback] of [...timers]) {
                if (!callback()) timers.delete(id);
            }
        },
    };
}

export class Widget extends Signals {
    constructor(properties = {}) {
        super();
        this.children = []; this.prefixes = []; this.suffixes = [];
        this._selected = 0; this._text = '';
        Object.assign(this, properties);
    }
    set selected(value) {
        const changed = this._selected !== value;
        this._selected = value;
        if (changed) this.emit('notify::selected');
    }
    get selected() { return this._selected; }
    set text(value) { this._text = value; this.emit('changed'); }
    get text() { return this._text; }
    add(child) { this.children.push(child); }
    add_row(child) { this.add(child); }
    add_suffix(child) { this.suffixes.push(child); }
    add_prefix(child) { this.prefixes.push(child); }
    add_css_class() {}
    remove(child) { this.children = this.children.filter(item => item !== child); }
    set_default_size() {}
    add_toast(toast) { this.lastToast = toast; }
}

export function preferences(initialSettings = {}, apps = [
    ['code.desktop', 'Visual Studio Code'],
    ['org.gnome.Nautilus.desktop', 'Files'],
    ['org.gnome.Calculator.desktop', 'Calculator'],
    ['custom-launcher.desktop', 'Custom Zed launcher', 'dev.zed.Zed'],
]) {
    const settings = new Settings(initialSettings);
    const window = new Widget();
    const installed = apps.map(([id, name, wmClass]) => ({
        should_show: () => true,
        get_id: () => id,
        get_display_name: () => name,
        get_startup_wm_class: () => wmClass,
        get_icon: () => null,
    }));
    const PreferencesClass = loadClass('prefs.js', {
        ...rules,
        ExtensionPreferences: class { getSettings() { return settings; } },
        Adw: Object.fromEntries(['PreferencesPage', 'PreferencesGroup', 'ActionRow',
            'ShortcutLabel', 'ExpanderRow', 'ComboRow', 'EntryRow', 'Toast'].map(key => [key, Widget])),
        Gtk: {Align: {CENTER: 0}, Button: Widget, Image: Widget,
            StringList: {new: value => value}},
        Gdk: {ModifierType: {}},
        Gio: {AppInfo: {get_all: () => installed}},
    }, 'ShortcutPreferences');
    const preferences = new PreferencesClass();
    preferences.fillPreferencesWindow(window);
    function flatten(node) {
        return [node, ...[...node.children, ...node.suffixes, ...node.prefixes].flatMap(flatten)];
    }
    return {
        preferences, window, settings,
        find: title => flatten(window).find(widget => widget.title === title || widget.label === title),
    };
}
