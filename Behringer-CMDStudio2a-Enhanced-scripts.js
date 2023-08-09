// ****************************************************************************
// * Mixxx mapping script file for the Behringer CMD Studio 2a.
// * Author: Sam Graham, based on Rafael Ferran, Barney Garrett and Xxx previous works
// * Version 1.0.0 (Aug 2023)
// * Forum: http://www.mixxx.org/forums/viewtopic.php?f=7&amp;t=7868
// * Wiki: http://www.mixxx.org/wiki/doku.php/behringer_cmd_studio_4a
// ****************************************************************************

// TODOs:
//   * change plusminus to only move loopin/loopout if loop button held?

////////////////////////////////////////////////////////////////////////
// JSHint configuration                                               //
////////////////////////////////////////////////////////////////////////
/* global engine                                                      */
/* global script                                                      */
/* global print                                                       */
/* global midi                                                        */
////////////////////////////////////////////////////////////////////////

// Master function definition.
function BehringerCMDStudio2a() {}

(function (controller) {

// EDIT mode state (Assign A button): RED / BLUE / BLINK
controller.editModes = { red: 0, blue: 1, blink: 2, disabled: -1 };

// ***************************** Preferences ***********************

// Edit preferences in the Behringer-CMDStudio2a-Enhanced-preferences.js file, not here.
// This just sets defaults to be used when someone copies in their old preferences file.

var BehringerCMDStudio2aPreferenceDefaults = {
    // Set to true to turn the MODE shift button into one that's only active while held.
    // Set as false for layer cycle behaviour of press to cycle between [OFF, ON-ONCE, LOCKED-ON]
    holdToModeShift: true,

    // Sets the jogwheels sensitivity. 1 is default, 2 is twice as sensitive, 0.5 is half as sensitive.
    // First entry is default mode, second is shifted mode.
    scratchSensitivity: [1.0, 10.0],

    // Semantic mode names.
    // By default RED is SAMPLE mode, BLUE is edit LOOP mode, and BLINK is edit INTROOUTRO mode.
    // Valid values are 'red', 'blue', 'blink' and 'disabled'.
    editModes: {
        sample:     'red',
        loop:       'blue',
        introoutro: 'blink',
    },

    // What edit mode to start in.
    // Value values are: sample, loop, introoutro.
    startInEditMode: 'sample',

    // Whether to start with vinyl mode enabled or not.
    startInVinylMode: true,

    // Whether to automatically open the preview deck when previewing with shift-FILE.
    autoOpenPreviewDeck: true,

    // Whether to automatically enable/disable keylock during rate changes.
    autoKeyLock: true,

    // Size of beat loops to have assigned to the pads in loop edit mode.
    beatLoops: [0.125, 0.25, 0.5, 1, 2, 4, 8, 16],

    // How long to hold the assignB button to indicate you intended to use it as a layer/shift
    // button but changed your mind, so that the loop toggle press action doesn't happen on release.
    assignBOoopsTime: 500, // in milliseconds

    // Should fader-stopping (shift+fader down) reset to the cue point after stopping?
    faderStopGotoCue: true,

    // Whether the unshifted behaviour of the headphones knob should be head gain or head mix
    headGainIsDefault: true,
};

controller.preferences = {};

// Ew, no Object.assign(), just how out-of-date is QTScript anyway?
(function () {
//print("Copying preferences...");
var sources = [BehringerCMDStudio2aPreferenceDefaults, BehringerCMDStudio2aPreferences];
for (var i = 0; i < sources.length; i++) {
    var source = sources[i];
    for (var key in source) {
        //print("  Looking at key '" + key + "'");
        if (source.hasOwnProperty(key)) {
            //print("    ...copying.");
            controller.preferences[key] = source[key];
        }
    }
}
//print("...preferences copied");
})();

controller.editModes.sample     = controller.editModes[controller.preferences.editModes.sample || 'red'];
controller.editModes.loop       = controller.editModes[controller.preferences.editModes.loop || 'blue'];
controller.editModes.introoutro = controller.editModes[controller.preferences.editModes.introoutro || 'blink'];

// ***************************** Global Vars **********************************

// Vinyl button, ON -> scratch mode
controller.vinylButton = false;

// Status: pushed/not pushed of minus and plus buttons.
controller.minusPlusPushed = [{ plus: false, minus: false }, { plus: false, minus: false }];

// Status: pushed/not pushed of assign B buttons.
controller.assignBState = [{ pushed: false, ignoreRelease: false, timer: null }, { pushed: false, ignoreRelease: false, timer: null }];

// File and Folder buttons for library navigation
controller.folderButton = true; // Default is ON
controller.fileButton = false;

// MODE button state: OFF / shift / lock;
controller.modeShift = false;
controller.modeLock = false;

controller.editMode = [controller.editModes.red, controller.editModes.red];

// This is an odd order because they're aligned vertically not in the button order.
// This is so that 1/8 to 1 are on the left and 2 to 16 are on the right.
controller.beatLoops = (function (beatLoops) {
    return [0, 4, 1, 5, 2, 6, 3, 7].map(function (idx) { return beatLoops[idx]; });
})(controller.preferences.beatLoops);

// Set to true and each "Assign A" button press will cycle all controls to the next colour code.
// So you can debug what controls respond to colour.
controller.debug = false;

controller.sharedControls = {
    vinyl:  0x22,
    mode:   0x23,
    folder: 0x25,
    file:   0x26,
    up:     0x24,
    down:   0x27,

    head:   0x21,

    crossFader: 0x20,
};
controller.deckControls = {
    a:        0x08,
    b:        0x09,
    cue:      0x01,
    play:     0x02,
    pfl:      0x16,

    sync:     0x04,

    sampler1: 0x0E,
    sampler2: 0x0F,
    sampler3: 0x11,
    sampler4: 0x12,

    hotcue1:  0x0A,
    hotcue2:  0x0B,
    hotcue3:  0x0C,
    hotcue4:  0x0D,

    plus:     0x07,
    minus:    0x06,

    load:     0x17,

    fxHigh:   0x13, // 0xB0 status
    fxMid:    0x14, // 0xB0 status
    fxLow:    0x15, // 0xB0 status

    fader:    0x18, // 0xB0 status

    platter:  0x03, // touch: 0x90 status on, 0x80 off; 0xB0 status turn

    pitch:    0x05, // 0xB0 status
};
controller.deckNames = [
    'left',
    'right',
];
controller.deckOffsets = {
    left:  0x00,
    right: 0x30,
};

controller.controls = {};
for (var key in controller.sharedControls) {
    if (controller.sharedControls.hasOwnProperty(key)) {
        controller.controls[key] = controller.sharedControls[key];
    }
}
for (var deckName in controller.deckOffsets) {
    if (controller.deckOffsets.hasOwnProperty(deckName)) {
        for (var key in controller.deckControls) {
            if (controller.deckControls.hasOwnProperty(key)) {
                controller.controls[deckName + key.slice(0, 1).toUpperCase() + key.slice(1)] = controller.deckOffsets[deckName] + controller.deckControls[key];
            }
        }
    }
}

controller.colourableControls = [
    controller.controls.leftA,
    controller.controls.leftB,
    controller.controls.leftCue,
    controller.controls.leftPlay,
    controller.controls.leftPfl,

    controller.controls.rightA,
    controller.controls.rightB,
    controller.controls.rightCue,
    controller.controls.rightPlay,
    controller.controls.rightPfl,

    controller.controls.vinyl,
    controller.controls.mode,
    controller.controls.folder,
    controller.controls.file,
];

controller.statuses = {
    press:   0x90,
    release: 0x80,
    turn:    0xB0,

    colour:   0x90,
};

controller.values = {
    off: 0x00,
    on:  0x7F,

    release: 0x00,
    press:   0x7F,
};

controller.colours = {
    off: 0x00, // red
    on:  0x01, // green for play, blue for everything else
    blink: 0x02,

    disabled: 0x00,
    red:      0x00,
    blue:     0x01,
    green:    0x01,
};

// ************************ Initialisation stuff. *****************************

controller.initLEDs = function () {
    // (re)Initialise any LEDs that are direcctly controlled by this script.
    // Turn everything red (off)
    var that = this;
    this.colourableControls.forEach(function (control) {
        midi.sendShortMsg(that.statuses.colour, control, that.colours.off);
    });
}

controller.init = function (id, debugging) {
    this.connections = [];

    // Initialise anything that might not be in the correct state.
    this.initLEDs();
    midi.sendShortMsg(this.statuses.colour, this.controls.folder, this.colours.on); // Folder
    this.vinylButton = this.preferences.startInVinylMode;
    this.updateVinylLED();

    for (var i = 0; i < 2; i++) {
        this.editMode[i] = this.editModes[this.preferences.startInEditMode];
        this.updateEditModeColour(i + 1);
    }

    // check pfl modes and init LEDs
    if (engine.getValue('[Channel1]', 'pfl')) {
        midi.sendShortMsg(this.statuses.colour, this.controls.leftPfl, this.colours.on);
    }
    if (engine.getValue('[Channel2]', 'pfl')) {
        midi.sendShortMsg(this.statuses.colour, this.controls.rightPfl, this.colours.on);
    }

    // check loop modes and init LEDs
    if (engine.getValue('[Channel1]', 'loop_enabled')) {
        midi.sendShortMsg(this.statuses.colour, this.controls.leftB, this.colours.on);
    }
    if (engine.getValue('[Channel2]', 'loop_enabled')) {
        midi.sendShortMsg(this.statuses.colour, this.controls.rightB, this.colours.on);
    }

    this.previewDeckWasOpen = engine.getValue('[PreviewDeck]', 'show_previewdeck');

    if (this.preferences.autoKeyLock) {
        this.connections.push(engine.makeConnection('[Channel1]', 'rate', this.rateChanged.bind(this)));
        this.connections.push(engine.makeConnection('[Channel2]', 'rate', this.rateChanged.bind(this)));
    }

    engine.softTakeover("[Master]", "headGain", true);
    engine.softTakeover("[Master]", "headMix", true);
    engine.softTakeover("[Master]", "gain", true);
    for (var channel = 1; channel <= 2; channel++) {
        engine.softTakeover("[Channel" + channel + "]", "volume", true);
        engine.softTakeover("[Channel" + channel + "]", "pregain", true);
        engine.softTakeover("[EqualizerRack1_[Channel" + channel + "]_Effect1]", "parameter1", true);
        engine.softTakeover("[EqualizerRack1_[Channel" + channel + "]_Effect1]", "parameter2", true);
        engine.softTakeover("[EqualizerRack1_[Channel" + channel + "]_Effect1]", "parameter3", true);
    }
}

controller.shutdown = function () {
    // Leave the deck in a properly initialised state.
    this.initLEDs();
    this.connections.forEach(function (connection) {
        connection.disconnect();
    });
    this.connections = [];
}

controller.updateModeColour = function () {
    if (this.modeLock) {
        midi.sendShortMsg(this.statuses.colour, this.controls.mode, this.colours.blink);
    } else {
        midi.sendShortMsg(this.statuses.colour, this.controls.mode, this.modeShift ? this.colours.on : this.colours.off);
    }
}

controller.updateVinylLED = function () {
    if (this.vinylButton) {
        midi.sendShortMsg(this.statuses.colour, this.controls.vinyl, this.colours.on);
    } else {
        midi.sendShortMsg(this.statuses.colour, this.controls.vinyl, this.colours.off);
    }
}

controller.setModeShift = function (shift) {
    this.modeShift = shift;
    if (!shift) {
        // Auto turn off lock when unshifting.
        this.modeLock = false;
    }
    this.updateModeColour();
}

controller.setModeLock = function (lock) {
    this.modeLock = lock;
    if (lock) {
        // Auto turn on shift when locking.
        this.modeShift = true;
    }
    this.updateModeColour();
}

controller.modeShifted = function () {
    if (this.preferences.holdToModeShift) {
        return this.modeShift;
    }
    if (!this.modeShift) {
        return false;
    }
    if (this.modeLock) {
        return true;
    }
    this.setModeShift(false);
    return true;
}

controller.updateEditModeColour = function (deck) {
    var mode = this.editMode[deck - 1];
    var control = this.controls[this.deckNames[deck - 1] + 'A']; // leftA or rightA
    if (mode === this.editModes.blink) {
        midi.sendShortMsg(this.statuses.colour, control, this.colours.blink);
    } else if (mode === this.editModes.red) {
        midi.sendShortMsg(this.statuses.colour, control, this.colours.red);
    } else if (mode === this.editModes.blue) {
        midi.sendShortMsg(this.statuses.colour, control, this.colours.blue);
    } else {
        midi.sendShortMsg(this.statuses.colour, control, this.colours.off);
    }
}

controller.cycleEditMode = function (deck) {
    // FIXME: should check which modes are defined and skip. Or define an order?
    this.editMode[deck - 1]++;
    if (this.editMode[deck - 1] > this.editModes.blink) {
        this.editMode[deck - 1] = this.editModes.red;
    }
    this.updateEditModeColour(deck);
}

// Assign A button: cycle through edit modes: OFF/MODE1/MODE2
controller.assignAButtonsPush = function (channel, control, value, status, group) {
    if (value === this.values.press) {
        // Button pushed
        if (this.debug) {
            this.debugLEDs();
        } else {
            var deck = script.deckFromGroup(group);
            this.cycleEditMode(deck);
        }
    }
}

// Assign B button:
//   PRESS:       toggle loop
//   shift+PRESS: remove loop
//   HOLD+hotcue: save to loop hotcue if unset, load from hotcue if set
controller.assignBButtonsPush = function (channel, control, value, status, group) {
    var deck = script.deckFromGroup(group);
    var buttonState = this.assignBState[deck - 1];

    buttonState.pushed = (value === this.values.press);
    if (value === this.values.press) { // Button pushed
        buttonState.ignoreRelease = false;
        // set delay timer to set ignoreRelease after 500ms (configurable)
        buttonState.timer = engine.beginTimer(this.preferences.assignBOoopsTime, function () {
            buttonState.ignoreRelease = true;
            engine.stopTimer(buttonState.timer);
            buttonState.timer = null;
        });
    } else {
        if (!buttonState.ignoreRelease) {
            if (this.modeShifted()) {
                engine.setValue(group, "loop_remove", 1);
            } else {
                engine.setValue(group, "reloop_toggle", 1);
            }
        }
        if (buttonState.timer) {
            engine.stopTimer(buttonState.timer);
            buttonState.timer = null;
        }
    }
    buttonState.ignoreRelease = false;
}



// Vinyl button ON/OFF
controller.vinylButtonPush = function (channel, control, value, status, group) {
    if (value === this.values.press) { // Button pushed
        if (this.modeShifted()) {
            // Toggle recording. Needed to stick this somewhere, and this is easy to remember. For me anyway.
            engine.setValue("[Recording]", "toggle_recording", 1);
        } else {
            this.vinylButton = !this.vinylButton; //opposite states
            this.updateVinylLED();
        }
    }
}



// Mode button ON/OFF
controller.modeButtonPush = function (channel, control, value, status, group) {
    if (value === this.values.press) { // Button pushed
        if (this.preferences.holdToModeShift) {
            this.setModeShift(true);
        } else if (this.modeLock) {
            this.setModeShift(false); // locked -> reset to unshifted
        } else if (this.modeShift) {
            this.setModeLock(true); // shifted -> locked
        } else {
            this.setModeShift(true); // unshifted -> shifted
        }
    } else { // Button release
        if (this.preferences.holdToModeShift) {
            this.setModeShift(false);
        }
    }
}


//Folder button behaviour
controller.folderButtonPush = function (channel, control, value, status, group) {
    if (controller.folderButton) {
        engine.setValue(group, "ToggleSelectedSidebarItem", 1); // expand/collapse view
    } else {
        controller.folderButton = true;
        midi.sendShortMsg(this.statuses.colour, this.controls.folder, this.colours.on);
        controller.fileButton = false;
        midi.sendShortMsg(this.statuses.colour, this.controls.file, this.colours.off);
        // focus on folder view
    }
}



//File button behaviour
controller.fileButtonPush = function (channel, control, value, status, group) {
    if (controller.fileButton) {
        if (this.modeShifted()) {
            // Shift: load to preview or stop previewing.
            if (engine.getValue('[PreviewDeck1]', "play")) {
                engine.setValue('[PreviewDeck1]', "stop", 1);
                if (!this.previewDeckWasOpen && this.preferences.autoOpenPreviewDeck) {
                    engine.setValue('[PreviewDeck]', 'show_previewdeck', 0);
                }
            } else {
                engine.setValue('[PreviewDeck1]', "LoadSelectedTrackAndPlay", 1);
                this.previewDeckWasOpen = engine.getValue('[PreviewDeck]', 'show_previewdeck');
                if (!this.previewDeckWasOpen && this.preferences.autoOpenPreviewDeck) {
                    engine.setValue('[PreviewDeck]', 'show_previewdeck', 1);
                }
            }
        } else {
            // Load to first stopped deck.
            engine.setValue(group, "LoadSelectedIntoFirstStopped", 1);
        }
    } else {
        controller.folderButton = false;
        midi.sendShortMsg(this.statuses.colour, this.controls.folder, this.colours.off);
        controller.fileButton = true;
        midi.sendShortMsg(this.statuses.colour, this.controls.file, this.colours.on);
        // focus on file view
        // Move cursor down one to highlight top track, otherwise there's no
        // visible effect within Mixxx that we've changed view.
        engine.setValue(group, "SelectNextTrack", 1);
    }
}



// Up button behaviour (folder/file depending)
controller.upButtonPush = function (channel, control, value, status, group) {
    if (controller.folderButton) { // Folder mode
        // Act as though mode lock is ON for convenience
        if (!this.modeShift) { // Mode shift is OFF
            engine.setValue(group, "SelectPrevPlaylist", 1);
        } else {
            //engine.setValue(group, "SelectPlaylist", -10);
            // Doesn't work as advertised, use this hack
            for (var i = 0; i < 10; i++) {
                engine.setValue(group, "SelectPrevPlaylist", 1);
            }
        }
    } else { // File mode
        // Act as though mode lock is ON for convenience
        if (!this.modeShift) { // Mode shift is OFF
            engine.setValue(group, "SelectPrevTrack", 1); // Up one by one
        } else { // Mode shift is ON
            engine.setValue(group, "SelectTrackKnob", -10); // Up ten by ten
        }
    }
}



// Down button behaviour (folder/file depending)
controller.downButtonPush = function (channel, control, value, status, group) {
    if (controller.folderButton) { // Folder mode
        // Act as though mode lock is ON for convenience
        if (!this.modeShift) { // Mode shift is OFF
            engine.setValue(group, "SelectNextPlaylist", 1);
        } else {
            //engine.setValue(group, "SelectPlaylist", 10);
            // Doesn't work as advertised, use this hack
            for (var i = 0; i < 10; i++) {
                engine.setValue(group, "SelectNextPlaylist", 1);
            }
        }
    } else { // File mode
        // Act as though mode lock is ON for convenience
        if (!this.modeShift) { // Mode shift is OFF
            engine.setValue(group, "SelectNextTrack", 1); // Down one by one
        } else { // Mode shift is ON
            engine.setValue(group, "SelectTrackKnob", 10); // Down ten by ten
        }
    }
}



// Speed/Loop controls
// Minus buttons
controller.minusButtonPush = function (channel, control, value, status, group) {
    var deck = script.deckFromGroup(group);

    controller.minusPlusPushed[deck - 1].minus = (value === this.values.press);

    if (!this.modeShifted()) {
        // Not mode Shift
        if (this.editMode[deck - 1] === this.editModes.loop) {
            // loop mode
            if (value === this.values.press) {
                //Button push
                engine.setValue(group, "loop_in", 1);
            } else {
                // Button release
                engine.setValue(group, "loop_in", 0);
            }
        } else {
            // Speed (tempo) mode
            if (value === this.values.press) {
                // Button push
                if (controller.minusPlusPushed[deck - 1].plus) {
                    // Plus button is pushed too
                    engine.setValue(group, "rate", 0); // Reset slider
                } else {
                    engine.setValue(group, "rate_temp_down", 1);
                }
            } else {
                // Button release
                controller.minusPlusPushed[deck - 1].minus = false;
                engine.setValue(group, "rate_temp_down", 0);
            }
        }
    } else {
        // Mode Shifted
        // Beatjump backwards
        if (value === this.values.press) {
            engine.setValue(group,"beatjump_backward", 1);
        }
    }
}



// Plus buttons
controller.plusButtonPush = function (channel, control, value, status, group) {
    var deck = script.deckFromGroup(group);

    controller.minusPlusPushed[deck - 1].plus = (value === this.values.press);

    if (!this.modeShifted()) {
        // Not mode Shift
        if (this.editMode[deck - 1] === this.editModes.loop) {
            // loop mode
            if (value === this.values.press) {
                //Button push
                engine.setValue(group, "loop_out", 1);
            } else {
                // Button release
                engine.setValue(group, "loop_out", 0);
            }
        } else {
            // Speed (tempo) mode
            if (value === this.values.press) {
                // Button push
                if (controller.minusPlusPushed[deck - 1].minus) {
                    // Minus button is pushed too
                    engine.setValue(group, "rate", 0); // Reset slider
                } else {
                    engine.setValue(group, "rate_temp_up", 1);
                }
            } else {
                // Button release
                controller.minusPlusPushed[deck - 1].plus = false;
                engine.setValue(group, "rate_temp_up", 0);
            }
        }
    } else {
        // Mode Shifted
        // Beatjump backwards
        if (value === this.values.press) {
            engine.setValue(group,"beatjump_forward", 1);
        }
    }
}


// Hotcue buttons. Edit mode: OFF is 1-4, INTROOUTRO: 5-8.
controller.hotCueButtons = function (channel, control, value, status, group) {
    var deck = script.deckFromGroup(group);
    var deckName = this.deckNames[deck - 1];
    var button = control - this.controls[deckName + 'Hotcue1'] + 1;
    var bState = this.assignBState[deck - 1];

    if (value === this.values.press) { // Button pushed
        if (bState.pushed) {
            // Loop button (Assign B) is held.
            //   SHIFT: clear hotcue
            //   set:   activate loop from hotcue
            //   unset: save loop to hotcue
            if (!this.modeShifted()) {
                if (engine.getValue(group, "hotcue_" + button + "_status")) {
                    engine.setValue(group, "hotcue_" + button + "_activateloop", 1);
                } else {
                    engine.setValue(group, "hotcue_" + button + "_setloop", 1);
                }
            } else {
                engine.setValue(group, "hotcue_" + button + "_clear", 1);
            }
            bState.ignoreRelease = true;
        } else if (this.editMode[deck - 1] === this.editModes.loop) {
            var beats = this.beatLoops[button - 1];
            if (!this.modeShifted()) {
                // Not mode Shift
                // Edit mode LOOP: beatloops 1/4 to 1
               engine.setValue(group, "beatloop_" + beats + "_toggle", 1);
            } else {
                // Mode Shifted
                // Edit mode LOOP: set beatjump size 1/4 to 1
               engine.setValue(group, "beatjump_size", beats);
            }
        } else {
            // Edit mode SAMPLE: use hotcues 1-4
            // Edit mode INTROOUTRO: use hotcues 5-8
            if (this.editMode[deck - 1] === this.editModes.introoutro) {
                button += 4;
            }

            if (!this.modeShifted()) {
                // Not mode Shift
                engine.setValue(group, "hotcue_"+button+"_activate", 1);
            } else {
                // Mode Shifted
                engine.setValue(group, "hotcue_"+button+"_clear", 1);
            }
        }
    } else {
        // hotcue release
        if (!bState.pushed && this.editMode[deck - 1] !== this.editModes.loop && !this.modeShifted()) {
            // Edit mode SAMPLE: use hotcues 1-4
            // Edit mode INTROOUTRO: use hotcues 5-8
            if (this.editMode[deck - 1] === this.editModes.introoutro) {
                button += 4;
            }
            engine.setValue(group, "hotcue_"+button+"_activate", 0);
        }
    }
}


// Sample buttons. Depending on edit mode: Used to control samples or the intro/outro markers.
controller.sampleButtons = function (channel, control, value, status, group) {
    // Cant use deckFromGroup as these are all bound to the sampler decks instead.
    var deck = control <= this.controls.leftSampler4 ? 1 : 2;
    var deckName = this.deckNames[deck - 1];
    var button = control - this.controls[deckName + 'Sampler1'] + 1;
    if (button > 2) button--; // Buttons 2-3 have a gap between.

    if (value === this.values.press) { // Button pushed
        if (this.editMode[deck - 1] === this.editModes.sample) {
            // Edit mode SAMPLE: play samples

            if (!this.modeShifted()) {
                engine.setValue(group, "start_play", 1); // If not mode shift, play from start.
            } else {
                engine.setValue(group, "start_stop", 1); // Else, stop and go to start.
            }
        } else if (this.editMode[deck - 1] === this.editModes.loop) {
            group = deck === 1 ? '[Channel1]' : '[Channel2]';
            var beats = this.beatLoops[button + 3];
            if (!this.modeShifted()) {
                // Not mode Shift
                // Edit mode LOOP: beatloops 2 to 16
                engine.setValue(group, "beatloop_" + beats + "_toggle", 1);
            } else {
                // Mode Shifted
                // Edit mode LOOP: set beatjump size 2 to 16
               engine.setValue(group, "beatjump_size", beats);
            }
        } else if (this.editMode[deck - 1] === this.editModes.introoutro) {
            // Edit mode INTROOUTRO: edit intro/outro markers.
            group = deck === 1 ? '[Channel1]' : '[Channel2]';

            var intro_outro = (button < 3) ? 'intro' : 'outro'; // 1-2 and 3-4
            var start_end = (button % 2) ? 'start' : 'end'; // 1, 3 and 2, 4
            var cmd = intro_outro + "_" + start_end;

            if (!this.modeShifted()) {
                engine.setValue(group, cmd + "_activate", 1); // Normal: set/jump
            } else {
                engine.setValue(group, cmd + "_clear", 1); // Shifted: clear
            }
        }
    }
}

// pfl/"cue a/b" buttons
controller.pflButtonPush = function (channel, control, value, status, group) {
    if (value === this.values.press) {
        if (!this.modeShifted()) { // Mode shift is OFF
            engine.setValue(group, "pfl", 1 - engine.getValue(group, 'pfl'));
        } else { // Mode shift is ON
            engine.setValue(group, "quantize", 1 - engine.getValue(group, 'quantize'));
        }
    }
}


// Cue buttons, Mode depending
controller.cue = function (channel, control, value, status, group) {
    if (value === this.values.press && this.modeShifted()) { // Mode is ON.
        engine.setValue(group, "cue_gotoandstop", 1);
    } else {
        // Mode is OFF.
        engine.setValue(group, "cue_default", (value == 127) ? 1 : 0);
    }
}



// Functions to deal with the wheel (i.e. scratcing and jog).
// Why is there no (XML) support in Mixxx for this most basic of functions?
// I suspect the vast majority of controller mappings use the same code
// (provided in the Wiki).
controller.wheelTouch = function (channel, control, value, status, group) {
    var deck = script.deckFromGroup(group);
    //channel = channel+1;
    if (controller.vinylButton && value > 0) {
        // Vinyl button is ON and we touch the wheel.
        var alpha = 1.0/8;
        var beta = alpha/32;
        engine.scratchEnable(deck, 128, 33+1/3, alpha, beta);
    } else {
        // Vinyl button is OFF or releasing wheel.
        engine.scratchDisable(deck);
    }
}


controller.wheelTurn = function (channel, control, value, status, group) {
    var deck = script.deckFromGroup(group);
    var newValue = value-64;
    if (engine.isScratching(deck)) {
        newValue *= this.preferences.scratchSensitivity[this.modeShift ? 1 : 0];
        engine.scratchTick(deck, newValue);  // Scratch!
    } else {
        engine.setValue(group, "jog", newValue); // Jog.
    }
}

controller.rateChanged = function (value, group, control) {
    if (this.preferences.autoKeyLock) {
        if (Math.abs(value) <= 0.001) {
            engine.setValue(group, "keylock", 0);
        } else {
            engine.setValue(group, "keylock", 1);
        }
    }
}

controller.pitchTurn = function (channel, control, value, status, group) {
    var deck = script.deckFromGroup(group);
    var newValue = value-64;

    if (newValue > 0) {
        engine.setValue(group, "rate_perm_up" + (this.modeShift ? "_small" : ""), newValue);
    } else if (newValue < 0) {
        engine.setValue(group, "rate_perm_down" + (this.modeShift ? "_small" : ""), -newValue);
    }
}

controller.syncButtonPush = function (channel, control, value, status, group) {
    var deck = script.deckFromGroup(group);
    if (status === this.statuses.press) {
        if (this.modeShifted() ) {
            engine.setValue(group, "sync_enabled", 0);
            engine.setValue(group, "rate", 0); // Reset slider
        } else {
            engine.setValue(group, "sync_enabled", 1 - engine.getValue(group, "sync_enabled"));
        }
    } else if (status === this.statuses.release) {
    }
}

controller.volumeFader = function (channel, control, value, status, group) {
    var deck = script.deckFromGroup(group);

    engine.setValue(group, "volume", value / 0x7f);
    if (this.modeShift) {
        // Fader-start/stop
        if (value === 0) {
            if (this.preferences.faderStopGotoCue) {
                engine.setValue(group, "cue_gotoandstop", true);
            } else {
                engine.setValue(group, "stop", true);
            }
        } else {
            engine.setValue(group, "play", true);
        }
    }
}

controller.headKnob = function (channel, control, value, status, group) {
    var isGain = (this.modeShift != this.preferences.headGainIsDefault);
    if (isGain) {
        engine.softTakeoverIgnoreNextValue("[Master]", "headMix");
        engine.setValue("[Master]", "headGain", script.absoluteNonLin(value, 0, 1, 5, 0, 0x7f));
    } else {
        engine.softTakeoverIgnoreNextValue("[Master]", "headGain");
        engine.setValue("[Master]", "headMix", script.absoluteLin(value, -1, 1, 0, 0x7f));
    }
}

controller.fxKnob = function (channel, control, value, status, group) {
    // Can't use deckFromGroup as these are all bound to the equalizer rack instead.
    var deck = control <= this.controls.leftFxLow ? 1 : 2;
    var deckName = this.deckNames[deck - 1];
    var knob = control - this.controls[deckName + 'FxHigh'] + 1; // high: 1, mid: 2, low: 3
    var fxParameter = 4 - knob; // low: param1, mid: param2, high: param3
    var isMasterKnob = (deck === 1 && knob === 1); // left deck high
    var isPreGainKnob = (knob === 2); // either deck mid

    if (this.modeShift && isMasterKnob) {
        engine.softTakeoverIgnoreNextValue(group, "parameter3");
        engine.setValue("[Master]", "gain", script.absoluteNonLin(value, 0, 1, 5, 0, 0x7f));
    } else if (this.modeShift && isPreGainKnob) {
        engine.softTakeoverIgnoreNextValue(group, "parameter2");
        engine.setValue("[Channel" + deck + "]", "pregain", script.absoluteNonLin(value, 0, 1, 4, 0, 0x7f));
    } else {
        if (isMasterKnob) {
            engine.softTakeoverIgnoreNextValue("[Master]", "gain");
        }
        if (isPreGainKnob) {
            engine.softTakeoverIgnoreNextValue("[Channel" + deck + "]", "pregain");
        }
        engine.setValue(group, "parameter" + fxParameter, script.absoluteNonLin(value, 0, 1, 4, 0, 0x7f));
    }
}

// Load Deck buttons. Loads to deck, or if mode-shifted clones other deck.
controller.loadDeck = function (channel, control, value, status, group) {
    if (value === this.values.press) { // Button pushed
        var deck = script.deckFromGroup(group);
        if (!this.modeShifted()) {
            engine.setValue(group, "LoadSelectedTrack", 1);
        } else {
            engine.setValue(group, "CloneFromDeck", 0); // Clone the other deck.
            //engine.setValue(group, "CloneFromDeck", deck == 1 ? 2 : 1); // Clone the other deck.
        }
    }
}


// Some junk to assist in debugging what controls respond to colour codes.
controller.debugColour = 0x00;

controller.debugLEDs = function () {
    this.debugColour++;
    for (key in this.controls) {
        if (this.controls.hasOwnProperty(key)) {
            midi.sendShortMsg(this.statuses.colour, this.controls[key], this.debugColour);
        }
    }
}

})(BehringerCMDStudio2a);
