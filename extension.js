/* extension.js
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

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Keyboard from 'resource:///org/gnome/shell/ui/status/keyboard.js';

export default class LayoutLabelsExtension extends Extension {
  enable() {
    this._settings = this.getSettings();
    this._inputSourceManager = Keyboard.getInputSourceManager();

    if (!this._inputSourceManager) {
      console.warn('[layout-labels] InputSourceManager not available');
      return;
    }

    // Store original shortNames to restore on disable
    this._originalShortNames = new Map();

    // Apply custom labels to all input sources
    this._applyLabels();

    // Re-apply labels when settings change
    this._settingsChangedId = this._settings.connect('changed::labels', () => this._applyLabels());

    // Re-apply labels when input sources are reloaded
    this._sourcesChangedId = this._inputSourceManager.connect('sources-changed', () => {
      this._originalShortNames.clear();
      this._applyLabels();
    });

    // console.log('[layout-labels] Extension enabled');
  }

  disable() {
    // Restore original shortNames
    this._restoreOriginalLabels();

    if (this._settingsChangedId && this._settings) {
      this._settings.disconnect(this._settingsChangedId);
      this._settingsChangedId = null;
    }

    if (this._sourcesChangedId && this._inputSourceManager) {
      this._inputSourceManager.disconnect(this._sourcesChangedId);
      this._sourcesChangedId = null;
    }

    this._originalShortNames = null;
    this._settings = null;
    this._inputSourceManager = null;

    // console.log('[layout-labels] Extension disabled');
  }

  _applyLabels() {
    if (!this._inputSourceManager) return;

    const labelsVariant = this._settings.get_value('labels');
    const labelsDict = labelsVariant.deepUnpack() || {};

    // Get all input sources
    const inputSources = this._inputSourceManager.inputSources;
    if (!inputSources) return;

    // Iterate through all input sources and apply custom labels
    for (const index in inputSources) {
      const source = inputSources[index];
      if (!source || source.type !== 'xkb') continue;

      const sourceId = source.id;
      const customLabel = labelsDict[sourceId];

      // Store original shortName if not already stored
      if (!this._originalShortNames.has(sourceId)) this._originalShortNames.set(sourceId, source.shortName);

      if (customLabel) {
        // Directly modify the shortName property
        source.shortName = customLabel;
      } else {
        // Restore original if no custom label
        const original = this._originalShortNames.get(sourceId);
        if (original) source.shortName = original;
      }
    }
  }

  _restoreOriginalLabels() {
    if (!this._inputSourceManager || !this._originalShortNames) return;

    const inputSources = this._inputSourceManager.inputSources;
    if (!inputSources) return;

    for (const index in inputSources) {
      const source = inputSources[index];
      if (!source) continue;

      const original = this._originalShortNames.get(source.id);
      if (original) source.shortName = original;
    }
  }
}
