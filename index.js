import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";

import {
    //activateSendButtons,
    //deactivateSendButtons,
    //animation_duration,
    eventSource,
    event_types,
    //extension_prompt_roles,
    //extension_prompt_types,
    generateQuietPrompt,
    //is_send_press,
    saveSettingsDebounced,
    //substituteParamsExtended,
    //generateRaw,
    //getMaxContextSize,
    //setExtensionPrompt,
    //streamingProcessor,
} from "../../../../script.js";

// Keep track of where your extension is located, name should match repo name
const extensionName = "st_claude_utils";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const extensionSettings = extension_settings[extensionName];
const defaultSettings = {
  cache_refresher_enabled: true,
  word_count_enabled: true,
  time_counter_enabled: true
};

let cacheRefreshInterval = null;
let startTime = null;


async function loadSettings() {
  //toastr.info("loadSettings");
  // Load default first time
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }
  //toastr.info("largo: " + Object.keys(extension_settings[extensionName]).length);
  
  // Cache Refresher
  $("#cache_refresher_enabled").prop("checked", extensionSettings.cache_refresher_enabled);
  
  // World Count
  $("#word_count_enabled").prop("checked", extensionSettings.word_count_enabled);
   
  // Time Counter  
  $("#time_counter_enabled").prop("checked", extensionSettings.time_counter_enabled);
}

function onCacheRefresherEnabled(event) {
  const value = Boolean($(event.target).prop("checked"));
  extensionSettings.cache_refresher_enabled = value;
  saveSettingsDebounced();
  
  if(value) {
    toastr.info("Cache refresher Enabled !");
  }
  else {
    clearCacheRefreshInterval();
    toastr.info("Cache refresher Disabled !");
  }
}

function onWordCountEnabled(event) {
  const value = Boolean($(event.target).prop("checked"));
  extensionSettings.word_count_enabled = value;
  saveSettingsDebounced();
  
  if(value) {
    toastr.info("Word Count Enabled !");
  }
  else {
    toastr.info("Word Count Disabled !");
  }
}

function onTimeCounterEnabled(event) {
  const value = Boolean($(event.target).prop("checked"));
  extensionSettings.time_counter_enabled = value;
  saveSettingsDebounced();
  
  if(value) {
    toastr.info("Time Counter Enabled !");
  }
  else {
    toastr.info("Time Counter Disabled !");
  }
}


function onCacheRefresherButtonClick(event) {
  //toastr.info("hey");
  //event.target.focus();
  //event.target.blur();
  //event.target.value = "Clicked!";
  //$(event.target).blur();
  //$("#trigger_cache_refresh_button").blur();

  refreshCache();
}

function resetCacheRefresh(type) {
  if(!extensionSettings.cache_refresher_enabled) {
    return;
  }
  if (!isValidStartTimerEvent(type)) {
    return;
  }
  //toastr.info("resetCacheRefresh called !");
  clearCacheRefreshInterval();

  const lastActivityTime = Date.now();
  const CACHE_VALIDITY = 1000 * 60 * 5;
  const REFRESH_DELAY = 1000 * 60 * 4 + 50 * 1000;
  //const REFRESH_DELAY = 1000*60;

  const thisInterval = setInterval(() => {
    const elapsed = Date.now() - lastActivityTime;
    
    //toastr.info("Elapsed: " + elapsed/1000);

    if (elapsed >= REFRESH_DELAY && elapsed < CACHE_VALIDITY) {
      clearInterval(thisInterval);
      if (cacheRefreshInterval === thisInterval) cacheRefreshInterval = null;
      refreshCache();
    }

    if (elapsed >= CACHE_VALIDITY) {
      clearInterval(thisInterval);
      if (cacheRefreshInterval === thisInterval) cacheRefreshInterval = null;
      toastr.info("Cache refresh timer over 5m, not refreshing.");
    }
  }, 1000);

  cacheRefreshInterval = thisInterval;
}

function clearCacheRefreshInterval() {
  //toastr.info("clearCacheRefreshInterval");
  if (cacheRefreshInterval !== null) {
    clearInterval(cacheRefreshInterval);
    cacheRefreshInterval = null;
  }
}

function refreshCache() {
  toastr.info("Refreshing cache !");
  generateQuietPrompt("OOC: [Ping Test Celia !. Answer in one word, don't think.]", false, false, '', '', 0);
}

function wordCount() {
  if(!extensionSettings.word_count_enabled) {
    return;
  }
  
  const lastMes = $('#chat').children('.mes').last();
  const messageText = lastMes.find('.mes_text').text();
  
  const wordCount = messageText.trim().split(/\s+/).length;
  toastr.info("Words: " + wordCount);
}

function saveTime(type) {
  if (!isValidStartTimerEvent(type)) {
    return;
  }
  //toastr.info("saveTime");
  startTime = Date.now();
}

function printTime() {
  if(!extensionSettings.time_counter_enabled) return;
  
  //toastr.info("printTime");
  if(startTime === null) return;
  
  const now = Date.now();
  
  const elapsedMs = now - startTime;
  const totalSeconds = Math.floor(elapsedMs / 1000);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const formatted = `${minutes}m ${seconds}s`;
  toastr.info(`Elapsed time: ${formatted}`);
}

function resetTime() {
  //toastr.info("resetTime");
  startTime = null;
}

// Other types: quiet, normal.
// Undefined is flow started by user msg.
// details in script.js
function isValidStartTimerEvent(type) {
  return (
    typeof type === 'undefined' ||
    type === 'swipe' ||
    type === 'continue' ||
    type === 'regenerate' ||
    typr === 'impersonate'
  );
}

function test(data) {
  toastr.info("test called !");
  toastr.info(`Valor de data: [${data}]`);
}

function addListeners() {
  // Cache refresher
  $("#cache_refresher_enabled").on("input", onCacheRefresherEnabled);
  $("#trigger_cache_refresh_button").on("click", onCacheRefresherButtonClick);
  
  // Word count
  $("#word_count_enabled").on("input", onWordCountEnabled);
  
  // Time Counter
  $("#time_counter_enabled").on("input", onTimeCounterEnabled);
}

jQuery(async () => {
  // Cache refresher
  eventSource.on(event_types.CHAT_COMPLETION_RESPONSE_OK, resetCacheRefresh);
  
  eventSource.on(event_types.CHAT_CHANGED, clearCacheRefreshInterval); 
  
  eventSource.on(event_types.GENERATION_STARTED, (type) => {
    if(isValidStartTimerEvent(type)) {
      clearCacheRefreshInterval();
    }
  });
  
  // Word Count
  eventSource.on(event_types.GENERATION_ENDED, wordCount);
  
  // Time counter
  eventSource.on(event_types.CHAT_COMPLETION_RESPONSE_OK, () => {
    printTime();
    saveTime();
  });
  
  //eventSource.on(event_types.MESSAGE_SENT, printTime);
  
  eventSource.on(event_types.CHAT_CHANGED, resetTime);
  
  
  // event testing
  // este es el mas cercano, pero retorna otra cosa, no type.
  // details in openai.js
  //eventSource.on(event_types.CHAT_COMPLETION_SETTINGS_READY, test);
  //eventSource.on(event_types.CHAT_COMPLETION_RESPONSE_OK, test);


  const settingsHtml = await $.get(`${extensionFolderPath}/claude-utils.html`);
  
  $("#extensions_settings").append(settingsHtml);
  
  addListeners();
  loadSettings();
});

// Pending:
// Arreglar botón - funciona pero queda verde.
// Linkear elementos faltantes de la UI
// ads validation for events. La vi x ahi.
// mover codigo a repo mio.
