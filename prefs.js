import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const SHORTCUTS = [
    ['close-item', 'Close tab or window',
        'Ctrl+W passes directly to browsers; other apps close the focused window.'],
    ['quit-app', 'Quit application',
        'Requests that every window of the focused application close.'],
];

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
        const page = new Adw.PreferencesPage({
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
            settings.connect(`changed::${key}`, updateLabel);
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
            description: 'For Ctrl+W, browsers receive the original keystroke directly, ' +
                'without a simulated key or delay. Other shortcuts use a ' +
                'best-effort simulated Ctrl+W in browsers. Avoid conflicts ' +
                'with GNOME shortcuts. Disabled means no shortcut assigned.',
        });
        page.add(info);
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
