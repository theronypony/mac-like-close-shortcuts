import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {usesTabClose} from './appRules.js';

// Needed only when the user chooses a custom close shortcut other than Ctrl+W.
const HELD_MODIFIERS = Clutter.ModifierType.SHIFT_MASK |
    Clutter.ModifierType.CONTROL_MASK |
    Clutter.ModifierType.MOD1_MASK |
    Clutter.ModifierType.MOD4_MASK |
    Clutter.ModifierType.SUPER_MASK |
    Clutter.ModifierType.META_MASK |
    Clutter.ModifierType.HYPER_MASK;
const POLL_MS = 20;
const QUIET_US = 40_000;
const PENDING_TIMEOUT_US = 3_000_000;

// GTK accelerator strings are normally canonicalized to "<Control>w".
// Accept the alternate "<Primary>w" form, too. Only exactly Ctrl+W
// qualifies for native passthrough, not Ctrl+Shift+W or Super+W.
function isNativeCloseAccelerator(accelerator) {
    return /^<(?:Control|Primary)>w$/i.test(accelerator ?? '');
}

export default class MacLikeShortcuts extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._closeBound = false;
        this._quitBound = false;
        this._pending = null;
        this._virtualKeyboard = null;
        this._focusId = global.display.connect(
            'notify::focus-window', () => {
                this._clearPending();
                this._syncCloseBinding();
            });
        this._closeSettingsId = this._settings.connect(
            'changed::close-item', () => {
                // Refresh when the preferences dialog changes the accelerator.
                this._clearPending();
                this._removeCloseBinding();
                this._syncCloseBinding();
            });
        this._quitSettingsId = this._settings.connect(
            'changed::quit-app', () => {
                this._clearPending();
                this._removeQuitBinding();
                this._syncQuitBinding();
            });
        const refreshAppRules = () => {
            this._clearPending();
            this._syncCloseBinding();
        };
        this._tabAppsSettingsId = this._settings.connect(
            'changed::tab-close-apps', refreshAppRules);
        this._windowAppsSettingsId = this._settings.connect(
            'changed::window-close-apps', refreshAppRules);
        this._syncCloseBinding();
        this._syncQuitBinding();
    }

    disable() {
        this._clearPending();
        if (this._focusId)
            global.display.disconnect(this._focusId);
        if (this._closeSettingsId)
            this._settings.disconnect(this._closeSettingsId);
        if (this._quitSettingsId)
            this._settings.disconnect(this._quitSettingsId);
        if (this._tabAppsSettingsId)
            this._settings.disconnect(this._tabAppsSettingsId);
        if (this._windowAppsSettingsId)
            this._settings.disconnect(this._windowAppsSettingsId);
        this._focusId = 0;
        this._closeSettingsId = 0;
        this._quitSettingsId = 0;
        this._tabAppsSettingsId = 0;
        this._windowAppsSettingsId = 0;
        this._removeCloseBinding();
        this._removeQuitBinding();
        this._virtualKeyboard = null;
        this._settings = null;
    }

    _addBinding(key, handler) {
        const action = Main.wm.addKeybinding(
            key, this._settings, Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL, handler);
        if (action === Meta.KeyBindingAction.NONE) {
            console.warn(`[Mac-like Shortcuts] Cannot register ${key}; ` +
                'another shortcut may already be using those keys.');
            return false;
        }
        return true;
    }

    _removeCloseBinding() {
        if (this._closeBound)
            Main.wm.removeKeybinding('close-item');
        this._closeBound = false;
    }

    _removeQuitBinding() {
        if (this._quitBound)
            Main.wm.removeKeybinding('quit-app');
        this._quitBound = false;
    }

    _focusedWindow() {
        return global.display.get_focus_window();
    }

    _usesTabClose(window) {
        if (!window || !this._settings)
            return false;
        const app = Shell.WindowTracker.get_default().get_window_app(window);
        return usesTabClose(
            [app?.get_id(), window.get_wm_class(), window.get_wm_class_instance()],
            this._settings.get_strv('tab-close-apps'),
            this._settings.get_strv('window-close-apps'));
    }

    _syncCloseBinding() {
        if (!this._settings)
            return;
        const shortcut = this._settings.get_strv('close-item')[0] ?? '';
        const window = this._focusedWindow();
        const allowNativeCtrlW = !!window &&
            isNativeCloseAccelerator(shortcut) && this._usesTabClose(window);

        // While a tab-closing app has focus and the shortcut is Ctrl+W,
        // don't register a compositor shortcut at all. The physical Ctrl+W
        // goes straight to the app. No injection, timers, or dropped presses.
        // Reinstall the binding after focus leaves the tab-closing app.
        if (!shortcut || allowNativeCtrlW) {
            this._removeCloseBinding();
            return;
        }
        if (!this._closeBound)
            this._closeBound = this._addBinding('close-item',
                () => this._closeItem());
    }

    _syncQuitBinding() {
        if (!this._settings)
            return;
        if (!this._settings.get_strv('quit-app').length) {
            this._removeQuitBinding();
            return;
        }
        if (!this._quitBound)
            this._quitBound = this._addBinding('quit-app',
                () => this._quitApp());
    }

    _closeItem() {
        const window = this._focusedWindow();
        if (!window)
            return;
        if (!this._usesTabClose(window)) {
            if (window.can_close())
                window.delete(global.get_current_time());
            return;
        }

        // This is only for custom shortcuts like Super+W. Ctrl+W itself
        // is never globally captured when a tab-closing app is focused.
        if (this._pending?.window === window) {
            this._pending.count++;
            return;
        }
        this._clearPending();
        const pending = {
            window,
            count: 1,
            sourceId: 0,
            readyAt: 0,
            startedAt: GLib.get_monotonic_time(),
        };
        this._pending = pending;
        pending.sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, POLL_MS, () => {
            if (this._pending !== pending)
                return GLib.SOURCE_REMOVE;
            const now = GLib.get_monotonic_time();
            if (this._focusedWindow() !== pending.window ||
                now - pending.startedAt > PENDING_TIMEOUT_US) {
                this._clearPending();
                return GLib.SOURCE_REMOVE;
            }
            if (global.get_pointer()[2] & HELD_MODIFIERS) {
                pending.readyAt = 0;
                return GLib.SOURCE_CONTINUE;
            }
            if (pending.readyAt === 0) {
                pending.readyAt = now + QUIET_US;
                return GLib.SOURCE_CONTINUE;
            }
            if (now < pending.readyAt)
                return GLib.SOURCE_CONTINUE;

            this._pending = null;
            pending.sourceId = 0;
            try {
                for (let i = 0; i < pending.count; i++) {
                    if (this._focusedWindow() !== pending.window)
                        break;
                    this._sendCtrlW();
                }
            } catch (error) {
                console.error(`[Mac-like Shortcuts] Tab Ctrl+W failed: ${error}`);
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    _sendCtrlW() {
        if (!this._virtualKeyboard) {
            const seat = global.stage.context.get_backend().get_default_seat();
            this._virtualKeyboard = seat.create_virtual_device(
                Clutter.InputDeviceType.KEYBOARD_DEVICE);
        }
        const keyboard = this._virtualKeyboard;
        const time = GLib.get_monotonic_time();
        keyboard.notify_keyval(time, Clutter.KEY_Control_L, Clutter.KeyState.PRESSED);
        try {
            keyboard.notify_keyval(time + 1_000, Clutter.KEY_w, Clutter.KeyState.PRESSED);
            keyboard.notify_keyval(time + 2_000, Clutter.KEY_w, Clutter.KeyState.RELEASED);
        } finally {
            keyboard.notify_keyval(time + 3_000, Clutter.KEY_Control_L, Clutter.KeyState.RELEASED);
        }
    }

    _quitApp() {
        const window = this._focusedWindow();
        if (!window)
            return;
        const app = Shell.WindowTracker.get_default().get_window_app(window);
        // Requests graceful quit; the application can show save prompts.
        if (app?.request_quit())
            return;
        for (const candidate of app?.get_windows() ?? [window]) {
            if (candidate.can_close())
                candidate.delete(global.get_current_time());
        }
    }

    _clearPending() {
        if (this._pending?.sourceId)
            GLib.Source.remove(this._pending.sourceId);
        this._pending = null;
    }
}
