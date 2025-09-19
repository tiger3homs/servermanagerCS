// ==UserScript==
// @name         Server Manager (Maps, Presets, PINs & UI)
// @namespace    http://tampermonkey.net/
// @version      2025-09-19
// @description  Enhances Play-CS.com server management: Smart map selection, customizable server presets (with auto-PIN for 5vs5), collapsible sections, UI cleanup, and improved server links.
// @author       tiger3homs aka obbe.00 on discord
// @match        https://play-cs.com/en/myservers
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  // --- Configuration Object ---
  // All configurable aspects of the script are defined here.
  const CONFIG = {
    favoriteMaps: ['de_mirage', 'de_nuke', 'de_tuscan', 'de_dust2', 'de_inferno', 'de_train',],
    collapsibleHeaders: ['New server', 'Specifications'],
    uiSelectors: {
      servers: 'tr.myserver[data-server]',
      serverLinks: 'td a',
      form: '#my-servers-form',
      promoCells: 'td.myserver[colspan="2"]',
      elementsToHide: [
        '#chat_open',
        '#chat_close',
        '.lobby2-tab-header-block.lobby2-border-bottom-white',
        '.lobby2-right-block'
      ],
      tabPanes: '.tab-content .tab-pane',
      goldTabLines: '.gold-tab-line'
    },
    serverPresets: {
      public: {
        isPublic: true,
        checkboxes: {
          'mp_friendlyfire': false, 'mp_autoteambalance': true, 'mp_afkbomb': true,
          'afk_kick': true, 'statistics': true, 'votekick': true, 'bonus_slot': true,
          'tfb': true, 'statsx': true, 'dib3': true, 'rwd_grenadedrop': true
        },
        dropdowns: {
          'minimal_skill': '0', 'ping_limit': '1000', 'mp_roundtime': '1.75',
          'mp_buytime': '0.25', 'mp_c4timer': '35', 'mp_freezetime': '1',
          'mp_startmoney': '5000', 'csem_sank_cd': '300', 'limit_hegren': '1',
          'limit_sgren': '1', 'limit_flash': '2'
        }
      },
      '5vs5': {
        isPublic: true,
        checkboxes: {
          'mp_friendlyfire': true, 'mp_autoteambalance': false, 'mp_afkbomb': true,
          'afk_kick': true, 'statistics': true, 'votekick': false, 'bonus_slot': false
        },
        dropdowns: {
          'minimal_skill': '0', 'ping_limit': '1000', 'mp_roundtime': '1.75',
          'mp_buytime': '0.25', 'mp_c4timer': '35', 'mp_freezetime': '1',
          'mp_startmoney': '800', 'csem_sank_cd': '300', 'limit_hegren': '1',
          'limit_sgren': '1', 'limit_flash': '2'
        }
      },
      deathmatch: {
        isPublic: true,
        checkboxes: {
          'mp_friendlyfire': true, 'mp_autoteambalance': true, 'mp_afkbomb': true,
          'afk_kick': true, 'statistics': true, 'votekick': true, 'bonus_slot': true,
          'tfb': true, 'statsx': true, 'dib3': true, 'rwd_grenadedrop': true
        },
        dropdowns: {
          'minimal_skill': '0', 'ping_limit': '1000', 'mp_roundtime': '2.5',
          'mp_buytime': '0.5', 'mp_c4timer': '35', 'mp_freezetime': '5',
          'mp_startmoney': '1000', 'csem_sank_cd': '300', 'limit_hegren': '1',
          'limit_sgren': '1', 'limit_flash': '2'
        }
      }
    }
  };

  // --- Utility Functions ---
  // A small set of reusable DOM helper functions to keep the main logic clean.
  const $ = selector => document.querySelector(selector);
  const $$ = selector => document.querySelectorAll(selector);
  const createElement = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    for (const key in attrs) {
      if (key.startsWith('on')) { // Handle event listeners
        el.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
      } else if (key === 'style' && typeof attrs[key] === 'object') { // Handle style object
        Object.assign(el.style, attrs[key]);
      } else {
        el.setAttribute(key, attrs[key]);
      }
    }
    children.forEach(child => {
      if (typeof child === 'string') el.appendChild(document.createTextNode(child));
      else if (child) el.appendChild(child);
    });
    return el;
  };

  /**
   * Generates a random 4-character PIN, either all numbers or all letters.
   * @returns {string} A 4-character PIN.
   */
  const generateRandomPin = () => {
    const useNumbers = Math.random() < 0.5; // 50% chance for numbers, 50% for letters
    let pin = '';
    for (let i = 0; i < 4; i++) {
      if (useNumbers) {
        pin += Math.floor(Math.random() * 10).toString(); // 0-9
      } else {
        const charCode = Math.floor(Math.random() * 26) + 97; // 'a' to 'z'
        pin += String.fromCharCode(charCode);
      }
    }
    return pin;
  };

  // --- Feature Modules ---
  // Each module encapsulates its specific functionality.

  /**
   * Initializes map selection features: favorite map buttons and a search input.
   */
  const initMapPicker = () => {
    $$(CONFIG.uiSelectors.servers).forEach(server => {
      const serverID = server.dataset.server;
      const mapSelect = server.querySelector(`select[name="server[${serverID}][map]"]`);
      if (!mapSelect) return;

      const container = createElement('div', { style: { marginTop: '5px', color: 'black' } });
      mapSelect.parentElement.insertBefore(container, mapSelect);

      const availableMaps = new Set([...mapSelect.options].map(opt => opt.value));

      // Favorite map buttons
      CONFIG.favoriteMaps.forEach(map => {
        if (availableMaps.has(map)) {
          const btn = createElement('button', {
            className: 'save-btn3',
            style: { marginBottom: '3px', marginRight: '3px' },
            onclick: (e) => {
              e.preventDefault();
              mapSelect.value = map;
              mapSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, map);
          container.appendChild(btn);
        }
      });

      // Search input
      const searchInput = createElement('input', {
        type: 'text',
        placeholder: 'Type to search map...',
        style: { marginLeft: '5px', padding: '2px 4px', width: '150px' },
        oninput: () => {
          const filter = searchInput.value.toLowerCase();
          let firstMatch = null;
          Array.from(mapSelect.options).forEach(opt => {
            const match = opt.value.toLowerCase().includes(filter);
            opt.style.display = match ? '' : 'none';
            if (!firstMatch && match) firstMatch = opt;
          });
          if (firstMatch) mapSelect.value = firstMatch.value;
          mapSelect.dispatchEvent(new Event('change', { bubbles: true })); // Trigger change for UI consistency
        },
        onkeydown: (e) => {
          if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            mapSelect.focus();
          }
        }
      });
      container.appendChild(searchInput);
    });
  };

  /**
   * Corrects server links that are missing the 'https:' protocol.
   */
  const fixServerLinks = () => {
    $$(CONFIG.uiSelectors.serverLinks).forEach(link => {
      if (link.href.startsWith('://')) {
        link.href = 'https' + link.href;
      }
    });
  };

  /**
   * Makes specified H3 sections collapsible.
   */
  const initCollapsibleSections = () => {
    $$('h3').forEach(header => {
      if (CONFIG.collapsibleHeaders.includes(header.textContent)) {
        const content = header.nextElementSibling;
        if (content) {
          content.style.display = 'none'; // Initially hide
          header.style.cursor = 'pointer';
          header.addEventListener('click', () => {
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
          });
        }
      }
    });
  };

  /**
   * Cleans up the "Promoted until" display in server table cells.
   */
  const cleanupPromoInfo = () => {
    $$(CONFIG.uiSelectors.promoCells).forEach(cell => {
      const htmlContent = cell.innerHTML;
      const promotedMatch = htmlContent.match(/Promoted until:<br>[\s\S]*/);
      if (promotedMatch && promotedMatch[0]) {
        cell.innerHTML = promotedMatch[0].trim();
      }
    });
  };

  /**
   * Adds buttons to apply predefined server mode presets to all servers.
   */
  const initServerModePresets = () => {
    const myServersForm = $(CONFIG.uiSelectors.form);
    if (!myServersForm) return;

    // Helper to apply settings for a given preset to all servers
    const applyPresetToAllServers = (presetName, presetConfig) => {
      $$(CONFIG.uiSelectors.servers).forEach(server => {
        const serverID = server.dataset.server;

        // Apply public status
        const publicCheckbox = $(`input[id="server[${serverID}][public]"]`);
        if (publicCheckbox) publicCheckbox.checked = presetConfig.isPublic;

        // Reset all cvar checkboxes first (important for applying new presets)
        // Look for checkboxes specifically within the server's settings block
        const cvarControlsContainer = server.nextElementSibling; // Assuming settings are in the next row
        if (cvarControlsContainer) {
          const allCvarCheckboxes = cvarControlsContainer.querySelectorAll('input[type="checkbox"][id^="server['+serverID+'][cvars]"]');
          allCvarCheckboxes.forEach(cb => cb.checked = false);
        }

        // Apply specific checkbox settings
        for (const cvar in presetConfig.checkboxes) {
          const checkbox = $(`input[id="server[${serverID}][cvars][${cvar}]"]`);
          if (checkbox) checkbox.checked = presetConfig.checkboxes[cvar];
        }

        // Apply specific dropdown settings
        for (const cvar in presetConfig.dropdowns) {
          const select = $(`select[name="server[${serverID}][cvars][${cvar}]"]`);
          if (select) select.value = presetConfig.dropdowns[cvar];
        }

        // --- New PIN generation logic for 5vs5 mode ---
        if (presetName === '5vs5') {
          const pinInput = $(`input[id="pin_${serverID}"]`);
          if (pinInput) {
            pinInput.value = generateRandomPin();
            // Optional: If you want to automatically trigger the "Set up PIN" button click
            // Be cautious with this as it likely triggers an AJAX request.
            // You might need to add a delay or ensure the field is saved after setting.
            // const setPinButton = $(`#pin_add_button_${serverID}`);
            // if (setPinButton) {
            //   setPinButton.click();
            // }
          }
        }
        // --- End New PIN generation logic ---


        // Trigger change events for all affected inputs/selects to ensure UI updates
        Array.from(server.querySelectorAll('input, select')).forEach(input => {
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    };

    // Create and inject the UI for mode preset buttons
    const modeContainer = createElement('div', { style: { marginBottom: '15px' } },
      createElement('h3', {}, 'Mode Presets')
    );

    for (const modeName in CONFIG.serverPresets) {
      const btn = createElement('button', {
        className: 'save-btn3',
        style: { marginRight: '5px', color: 'black' },
        onclick: (e) => {
          e.preventDefault();
          applyPresetToAllServers(modeName, CONFIG.serverPresets[modeName]); // Pass modeName and presetConfig
        }
      }, modeName.charAt(0).toUpperCase() + modeName.slice(1)); // Capitalize name
      modeContainer.appendChild(btn);
    }
    myServersForm.parentNode.insertBefore(modeContainer, myServersForm);
  };

  /**
   * Hides specified UI elements and adjusts padding for tab panes.
   */
  const cleanupUI = () => {
    // Hide specific elements
    CONFIG.uiSelectors.elementsToHide.forEach(selector => {
      const element = $(selector);
      if (element) element.style.display = 'none';
    });

    // Adjust padding for tab panes
    $$(CONFIG.uiSelectors.tabPanes).forEach(element => {
      element.style.padding = '16px 315px 0px 0px';
    });

    // Remove background image from gold tab lines
    $$(CONFIG.uiSelectors.goldTabLines).forEach(element => {
      element.style.backgroundImage = 'none';
    });
  };

  /**
   * Main initialization function that orchestrates all features.
   * Ensures the DOM is ready before executing.
   */
  const initializeScript = () => {
    // Execute all feature modules
    initMapPicker();
    fixServerLinks();
    initCollapsibleSections();
    cleanupPromoInfo();
    initServerModePresets();
    cleanupUI();

    console.log('Play-CS.com Server Manager script initialized!');
  };

  // --- Start the script ---
  // Wait for the DOM to be fully loaded before running the script.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeScript);
  } else {
    initializeScript(); // DOM is already loaded
  }
})();
