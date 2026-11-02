import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {isDefaultTabApp, normalizeAppId} from './appRules.js';

const SHORTCUTS = [
    ['close-item', 'Close tab or window',
        'Ctrl+W passes to browsers, Sublime Text, and your chosen apps; others close the window.'],
    ['quit-app', 'Quit application',
        'Requests that every window of the focused application close.'],
];

const APP_BEHAVIOR = {AUTOMATIC: 0, TAB: 1, WINDOW: 2};
const APP_SETTING_KEYS = ['tab-close-apps', 'window-close-apps'];

const ACCEL_MASK = Gdk.ModifierType.SHIFT_MASK |
    Gdk.ModifierType.CONTROL_MASK |
    Gdk.ModifierType.ALT_MASK |
    Gdk.ModifierType.SUPER_MASK |
    Gdk.ModifierType.META_MASK |
    Gdk.ModifierType.HYPER_MASK;

const MODIFIER_KEYVALS = new Set([
    Gdk.KEY_Shift_L, Gdk.KEY_Shift_R,
    Gdk.KEY_Control_L, Gdk.KEY_Control_R,
    Gdk.KEY_Alt_L, Gdk.KEY_Alt_R,
    Gdk.KEY_Super_L, Gdk.KEY_Super_R,
    Gdk.KEY_Meta_L, Gdk.KEY_Meta_R,
    Gdk.KEY_Hyper_L, Gdk.KEY_Hyper_R,
    Gdk.KEY_ISO_Level3_Shift,
]);

export default class ShortcutPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        // Keep settings alive for the whole preferences window and disconnect
        // callbacks before its widgets are disposed.
        window._settings = settings;
        const settingsSignals = [];
        window.search_enabled = true;
        window.set_default_size(760, 720);
        window.connect('close-request', () => {
            for (const id of settingsSignals)
                settings.disconnect(id);
            settingsSignals.length = 0;
            return false;
        });
        const page = new Adw.PreferencesPage({
            name: 'shortcuts',
            title: 'Keyboard shortcuts',
            icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: 'Shortcuts',
            description: 'Click Change and press a new key combination. ' +
                'Changes apply immediately.',
        });
        page.add(group);

        for (const [key, title, subtitle] of SHORTCUTS) {
            const row = new Adw.ActionRow({title, subtitle});
            const shortcut = new Adw.ShortcutLabel({
                disabled_text: 'Disabled',
                valign: Gtk.Align.CENTER,
            });
            const button = new Gtk.Button({
                label: 'Change…',
                valign: Gtk.Align.CENTER,
                margin_start: 12,
            });
            button.add_css_class('flat');
            row.add_suffix(shortcut);
            row.add_suffix(button);
            row.activatable_widget = button;
            group.add(row);

            const updateLabel = () => {
                shortcut.accelerator = settings.get_strv(key)[0] ?? '';
            };
            settingsSignals.push(settings.connect(`changed::${key}`, updateLabel));
            updateLabel();
            button.connect('clicked', () =>
                this._recordShortcut(window, settings, key, title));
        }

        const resetRow = new Adw.ActionRow({
            title: 'Restore default shortcuts',
            subtitle: 'Ctrl+W to close, Ctrl+Q to quit.',
        });
        const reset = new Gtk.Button({
            label: 'Reset',
            valign: Gtk.Align.CENTER,
        });
        resetRow.add_suffix(reset);
        resetRow.activatable_widget = reset;
        group.add(resetRow);
        reset.connect('clicked', () => {
            settings.reset('close-item');
            settings.reset('quit-app');
        });

        const info = new Adw.PreferencesGroup({
            title: 'Notes',
            description: 'Use App behavior to choose which apps close tabs. ' +
                'Those apps receive the original Ctrl+W directly, without a ' +
                'simulated key or delay. Other close shortcuts use a best-effort ' +
                'simulated Ctrl+W in those apps. The app must already support ' +
                'Ctrl+W for tab or document closing. Avoid conflicts with GNOME ' +
                'shortcuts. Disabled means no shortcut assigned.',
        });
        page.add(info);

        this._addAppPreferences(window, settings, settingsSignals);
    }

    _addAppPreferences(window, settings, settingsSignals) {
        const page = new Adw.PreferencesPage({
            name: 'apps',
            title: 'App behavior',
            icon_name: 'application-x-executable-symbolic',
        });
        window.add(page);

        const defaults = new Adw.PreferencesGroup({
            title: 'Choose what the close shortcut does',
            description: 'Automatic uses tab closing in browsers and Sublime Text, ' +
                'and window closing in other apps. Close tab lets the app handle ' +
                'Ctrl+W itself; the app decides what happens to its last tab. ' +
                'Changes apply immediately.',
        });
        page.add(defaults);
        const resetRow = new Adw.ActionRow({
            title: 'Restore automatic app behavior',
            subtitle: 'Clear app choices without changing your keyboard shortcuts.',
        });
        const reset = new Gtk.Button({label: 'Reset apps', valign: Gtk.Align.CENTER});
        resetRow.add_suffix(reset);
        resetRow.activatable_widget = reset;
        defaults.add(resetRow);

        const manualGroup = new Adw.PreferencesGroup({
            title: 'Add an app manually',
            description: 'For apps missing from the list, enter a desktop app ID ' +
                'or WM_CLASS, such as org.gnome.TextEditor.desktop. ' +
                'Add enables tab closing. IDs match exactly, ignoring letter ' +
                'case and an optional .desktop suffix.',
        });
        page.add(manualGroup);
        const entry = new Adw.EntryRow({title: 'App ID or WM_CLASS'});
        const add = new Gtk.Button({
            label: 'Add',
            valign: Gtk.Align.CENTER,
            sensitive: false,
        });
        entry.add_suffix(add);
        manualGroup.add(entry);
        entry.connect('changed', () => {
            add.sensitive = entry.text.trim().length > 0;
        });

        const customGroup = new Adw.PreferencesGroup({
            title: 'Custom identifiers',
            description: 'Remove an entry to restore its automatic behavior. ' +
                'If multiple identifiers match the same app, Close window takes precedence.',
            visible: false,
        });
        page.add(customGroup);
        const appsGroup = new Adw.PreferencesGroup({
            title: 'Installed applications',
            description: 'Use the search button to find an app by name or ID. ' +
                'Choose Close tab, Close window, or Automatic for each app.',
        });
        page.add(appsGroup);

        // Rows are keyed the same way as runtime rules. This avoids duplicate
        // entries when a user supplies a different case or a .desktop suffix.
        const rows = new Map();
        const installed = Gio.AppInfo.get_all()
            .filter(app => app.should_show() && app.get_id())
            .sort((a, b) => a.get_display_name().localeCompare(b.get_display_name()));

        const addRow = (identifier, title, app = null) => {
            const id = normalizeAppId(identifier);
            if (rows.has(id))
                return;
            const automatic = isDefaultTabApp([
                identifier, app?.get_startup_wm_class?.(),
            ]) ? 'Automatic (tab)' : 'Automatic (window)';
            const row = new Adw.ComboRow({
                title,
                subtitle: app ? identifier : 'Manual app ID or WM_CLASS',
                use_markup: false,
                title_lines: 1,
                subtitle_lines: 1,
                model: Gtk.StringList.new([automatic, 'Close tab', 'Close window']),
            });
            const state = {row, identifier, custom: !app, syncing: false};
            rows.set(id, state);
            if (app) {
                const icon = app.get_icon();
                if (icon)
                    row.add_prefix(new Gtk.Image({gicon: icon, pixel_size: 32}));
                appsGroup.add(row);
            } else {
                const remove = new Gtk.Button({
                    icon_name: 'user-trash-symbolic',
                    tooltip_text: 'Remove this rule and restore automatic behavior',
                    valign: Gtk.Align.CENTER,
                });
                remove.add_css_class('flat');
                row.add_suffix(remove);
                customGroup.add(row);
                customGroup.visible = true;
                remove.connect('clicked', () => {
                    this._setAppBehavior(settings, identifier, APP_BEHAVIOR.AUTOMATIC);
                    rows.delete(id);
                    customGroup.remove(row);
                    customGroup.visible = [...rows.values()].some(item => item.custom);
                });
            }
            row.connect('notify::selected', () => {
                if (!state.syncing)
                    this._setAppBehavior(settings, identifier, row.selected);
            });
        };

        for (const app of installed)
            addRow(app.get_id(), app.get_display_name(), app);
        if (!installed.length) {
            appsGroup.add(new Adw.ActionRow({
                title: 'No installed applications found',
                subtitle: 'You can still add apps manually above.',
                activatable: false,
            }));
        }

        const syncRows = () => {
            const tabApps = settings.get_strv('tab-close-apps');
            const windowApps = settings.get_strv('window-close-apps');
            for (const identifier of [...tabApps, ...windowApps]) {
                if (normalizeAppId(identifier))
                    addRow(identifier, identifier);
            }
            const tabIds = new Set(tabApps.map(normalizeAppId));
            const windowIds = new Set(windowApps.map(normalizeAppId));
            for (const [id, state] of rows) {
                state.syncing = true;
                state.row.selected = windowIds.has(id) ? APP_BEHAVIOR.WINDOW :
                    tabIds.has(id) ? APP_BEHAVIOR.TAB : APP_BEHAVIOR.AUTOMATIC;
                state.syncing = false;
            }
        };
        for (const key of APP_SETTING_KEYS)
            settingsSignals.push(settings.connect(`changed::${key}`, syncRows));
        syncRows();

        const addIdentifier = () => {
            const identifier = entry.text.trim();
            if (!normalizeAppId(identifier) || identifier.length > 255 ||
                /[/\\\x00-\x1f\x7f]/.test(identifier)) {
                window.add_toast(new Adw.Toast({
                    title: 'Enter an app ID or WM_CLASS, without a file path.',
                }));
                return;
            }
            this._setAppBehavior(settings, identifier, APP_BEHAVIOR.TAB);
            entry.text = '';
            window.add_toast(new Adw.Toast({title: 'Tab closing enabled for this app.'}));
        };
        add.connect('clicked', addIdentifier);
        entry.connect('entry-activated', addIdentifier);
        reset.connect('clicked', () => {
            for (const key of APP_SETTING_KEYS)
                settings.reset(key);
            for (const [id, state] of rows) {
                if (state.custom) {
                    rows.delete(id);
                    customGroup.remove(state.row);
                }
            }
            customGroup.visible = false;
        });
    }

    _setAppBehavior(settings, identifier, behavior) {
        if (![APP_BEHAVIOR.AUTOMATIC, APP_BEHAVIOR.TAB, APP_BEHAVIOR.WINDOW]
            .includes(behavior))
            return;
        const id = normalizeAppId(identifier);
        if (!id)
            return;
        // Remove both old choices, including differently cased duplicates.
        // A single identifier is never intentionally saved in both lists.
        for (const [index, key] of APP_SETTING_KEYS.entries()) {
            const values = settings.get_strv(key)
                .filter(value => normalizeAppId(value) !== id);
            if (behavior === index + 1)
                values.push(identifier.trim());
            settings.set_strv(key, values);
        }
    }

    _recordShortcut(window, settings, key, title) {
        // Temporarily disable BOTH global bindings so their existing shortcuts
        // can be captured by this GTK preferences dialog rather than GNOME.
        // Restore both keys if the user cancels or closes the dialog.
        const previous = new Map(SHORTCUTS.map(([k]) => [k, settings.get_strv(k)]));
        for (const [k] of SHORTCUTS)
            settings.set_strv(k, []);

        const dialog = new Gtk.Dialog({
            title: `Set shortcut: ${title}`,
            transient_for: window,
            modal: true,
            use_header_bar: true,
            default_width: 430,
        });
        dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);

        const content = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 24,
            margin_end: 24,
        });
        content.append(new Gtk.Label({
            label: 'Press a new shortcut',
            css_classes: ['title-2'],
        }));
        const hint = new Gtk.Label({
            label: 'Press a combination such as Ctrl+W or Super+Q.\n' +
                'Backspace disables the shortcut; Esc cancels.',
            justify: Gtk.Justification.CENTER,
            wrap: true,
            css_classes: ['dim-label'],
        });
        content.append(hint);
        dialog.get_content_area().append(content);

        let saved = false;
        const recorder = new Gtk.EventControllerKey();
        recorder.set_propagation_phase(Gtk.PropagationPhase.CAPTURE);
        recorder.connect('key-pressed', (_controller, keyval, _keycode, state) => {
            if (keyval === Gdk.KEY_Escape) {
                dialog.response(Gtk.ResponseType.CANCEL);
                return true;
            }
            if (MODIFIER_KEYVALS.has(keyval))
                return true;

            let accelerator;
            if (keyval === Gdk.KEY_BackSpace && !(state & ACCEL_MASK)) {
                accelerator = null;
            } else {
                const modifiers = state & ACCEL_MASK;
                if (!Gtk.accelerator_valid(keyval, modifiers)) {
                    hint.label = 'Invalid shortcut. Hold Ctrl, Super, or Alt ' +
                        'with another key.';
                    return true;
                }
                accelerator = Gtk.accelerator_name(keyval, modifiers);

                const otherKey = key === 'close-item' ? 'quit-app' : 'close-item';
                if ((previous.get(otherKey)[0] ?? '').toLowerCase() ===
                    accelerator.toLowerCase()) {
                    hint.label = 'That shortcut is already assigned to ' +
                        'the other action. Choose a different one.';
                    return true;
                }
            }

            // Restore the other action and commit the new value. Doing this
            // before closing ensures the extension sees the final settings.
            for (const [k, oldValue] of previous)
                settings.set_strv(k, k === key ? (accelerator ? [accelerator] : []) : oldValue);
            saved = true;
            dialog.response(Gtk.ResponseType.ACCEPT);
            return true;
        });
        dialog.add_controller(recorder);
        dialog.connect('response', () => {
            if (!saved) {
                for (const [k, oldValue] of previous)
                    settings.set_strv(k, oldValue);
            }
            dialog.destroy();
        });
        dialog.present();
    }
}
