/* prefs.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import { gettext as _, ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const LayoutLabelRow = GObject.registerClass(
  class LayoutLabelRow extends Adw.ActionRow {
    _init(sourceId, currentLabel, settings) {
      super._init({
        title: sourceId,
        subtitle: _('Shown as: %s').format(currentLabel || sourceId),
      });

      this._sourceId = sourceId;
      this._settings = settings;

      const entry = new Gtk.Entry({
        text: currentLabel || '',
        placeholder_text: sourceId,
        width_chars: 10,
      });

      entry.connect('changed', () => {
        this._updateLabel(entry.text);
      });

      this.add_suffix(entry);
      this._entry = entry;
    }

    _updateLabel(text) {
      const labelsVariant = this._settings.get_value('labels');
      const labelsDict = labelsVariant.deepUnpack() || {};

      if (text?.trim()) {
        labelsDict[this._sourceId] = text.trim();
      } else {
        delete labelsDict[this._sourceId];
      }

      // Convert back to a{ss} format using GLib.Variant
      const variant = GLib.Variant.new('a{ss}', labelsDict);
      this._settings.set_value('labels', variant);
      this.subtitle = _('Shown as: %s').format(text.trim() || this._sourceId);
    }
  },
);

export default class LayoutLabelsPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const page = new Adw.PreferencesPage({
      title: _('Layout Labels'),
    });

    const group = new Adw.PreferencesGroup({
      title: _('Custom Labels'),
      description: _('Set custom labels for your keyboard layouts. Leave empty to use the default label.'),
    });

    const settings = this.getSettings();
    const inputSourcesSettings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.input-sources',
    });

    const sources = inputSourcesSettings.get_value('sources').deepUnpack();
    const xkbSources = sources.filter(([type]) => type === 'xkb');

    if (xkbSources.length === 0) {
      group.add(
        new Adw.ActionRow({
          title: _('No XKB layouts found'),
          subtitle: _('Add keyboard layouts in Settings to configure custom labels.'),
        }),
      );
    } else {
      const labelsVariant = settings.get_value('labels');
      const labelsDict = labelsVariant.deepUnpack() || {};

      for (const [, sourceId] of xkbSources) {
        const currentLabel = labelsDict[sourceId] || '';
        group.add(new LayoutLabelRow(sourceId, currentLabel, settings));
      }
    }

    page.add(group);
    window.add(page);
  }
}
