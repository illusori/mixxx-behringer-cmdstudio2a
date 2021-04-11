// ****************************************************************************
// * Mixxx mapping script file for the Behringer CMD Studio 2a.
// * Author: Sam Graham, based on Rafael Ferran, Barney Garrett and Xxx previous works
// * Version 0.2 (Nov 2020)
// * Forum: http://www.mixxx.org/forums/viewtopic.php?f=7&amp;t=7868
// * Wiki: http://www.mixxx.org/wiki/doku.php/behringer_cmd_studio_4a
// ****************************************************************************

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

// EDIT mode state (Assign A button): OFF / MODE1 (steady) / MODE2 (blink)
BehringerCMDStudio2a.editModes = { off: 0, mode1: 1, mode2: 2, disabled: -1 };

// ***************************** User configurable bits ***********************

// Set to true to turn the MODE shift button into one that's only active while held.
// Set as false for layer cycle behaviour of press to cycle between [OFF, ON-ONCE, LOCKED-ON]
BehringerCMDStudio2a.holdToModeShift = true;


// Sets the jogwheels sensitivity. 1 is default, 2 is twice as sensitive, 0.5 is half as sensitive.
// First entry is default mode, second is shifted mode.
BehringerCMDStudio2a.scratchSensitivity = [1.0, 10.0];

// Semantic mode names.
// Change the value on these to soft-map to mode1/mode2 and the button will change behaviour.
// By default MODE1 is edit LOOP mode, and MODE2 is edit INTROOUTRO mode.
BehringerCMDStudio2a.editModes.loop       = BehringerCMDStudio2a.editModes.mode1;
BehringerCMDStudio2a.editModes.introoutro = BehringerCMDStudio2a.editModes.mode2;

// ***************************** Global Vars **********************************

// Vinyl button, ON -> scratch mode
BehringerCMDStudio2a.vinylButton = false;

BehringerCMDStudio2a.minusPlusPushed = [[false,false],[false,false]]; // Status: pushed/not pushed of minus and plus buttons.

// File and Folder buttons for library navigation
BehringerCMDStudio2a.folderButton = true; // Default is ON
BehringerCMDStudio2a.fileButton = false;

// MODE button state: OFF / shift / lock;
BehringerCMDStudio2a.modeShift = false;
BehringerCMDStudio2a.modeLock = false;

BehringerCMDStudio2a.editMode = [BehringerCMDStudio2a.editModes.off, BehringerCMDStudio2a.editModes.off];

// This is an odd order because they're aligned vertically not in the button order.
// This is so that 1/8 to 1 are on the left and 2 to 16 are on the right.
BehringerCMDStudio2a.beatLoops = [0.125, 2, 0.25, 4, 0.5, 8, 1, 16];

// Set to true and each "Assign A" button press will cycle all controls to the next colour code.
// So you can debug what controls respond to colour.
BehringerCMDStudio2a.debug = false;

BehringerCMDStudio2a.colourableControls = [
        0x08, // Assign A A
        0x09, // Assign A B
        0x38, // Assign B A
        0x39, // Assign B B
        0x01, // Cue A
        0x31, // Cue B
        0x02, // Play A
        0x32, // Play B
        0x16, // PFL A
        0x46, // PFL B

        0x22, // vinyl
        0x23, // mode
        0x25, // Folder
        0x26, // File

        0x04, // Sync A
        0x34, // Sync B
];

BehringerCMDStudio2a.colours = {
    off: 0x00, // red
    on:  0x01, // green for play, blue for everything else
    blink: 0x02,
};

// ************************ Initialisation stuff. *****************************

BehringerCMDStudio2a.initLEDs = function () {
    // (re)Initialise any LEDs that are direcctly controlled by this script.
    // Turn everything red (off)
    var that = this;
    this.colourableControls.forEach(function (control) {
        midi.sendShortMsg(0x90, control, that.colours.off);
    });
}

BehringerCMDStudio2a.init = function () {
    // Initialise anything that might not be in the correct state.
    BehringerCMDStudio2a.initLEDs();
    midi.sendShortMsg(0x90, 0x25, this.colours.on); // Folder
}

BehringerCMDStudio2a.shutdown = function () {
    // Leave the deck in a properly initialised state.
    BehringerCMDStudio2a.initLEDs();
}

BehringerCMDStudio2a.updateModeColour = function () {
    if (this.modeLock) {
        midi.sendShortMsg(0x90, 0x23, this.colours.blink);
    } else {
        midi.sendShortMsg(0x90, 0x23, this.modeShift ? this.colours.on : this.colours.off);
    }
}

BehringerCMDStudio2a.setModeShift = function (shift) {
    this.modeShift = shift;
    if (!shift) {
        // Auto turn off lock when unshifting.
        this.modeLock = false;
    }
    this.updateModeColour();
}

BehringerCMDStudio2a.setModeLock = function (lock) {
    this.modeLock = lock;
    if (lock) {
        // Auto turn on shift when locking.
        this.modeShift = true;
    }
    this.updateModeColour();
}

BehringerCMDStudio2a.modeShifted = function () {
    if (this.holdToModeShift) {
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

BehringerCMDStudio2a.updateEditModeColour = function (deck) {
    var mode = this.editMode[deck - 1];
    var control = deck === 1 ? 0x08 : 0x38; // Assign A on deck A or B.
    if (mode === this.editModes.off) {
        midi.sendShortMsg(0x90, control, this.colours.off);
    } else if (mode === this.editModes.mode1) {
        midi.sendShortMsg(0x90, control, this.colours.on);
    } else {
        midi.sendShortMsg(0x90, control, this.colours.blink);
    }
}

BehringerCMDStudio2a.cycleEditMode = function (deck) {
    this.editMode[deck - 1]++;
    if (this.editMode[deck - 1] > this.editModes.mode2) {
        this.editMode[deck - 1] = this.editModes.off;
    }
    this.updateEditModeColour(deck);
}

// Assign A button: cycle through edit modes: OFF/MODE1/MODE2
BehringerCMDStudio2a.assignButtonsPush = function (channel, control, value, status, group) {
    if (value === 127 ) {
        // Button pushed
        if (this.debug) {
            this.debugLEDs();
        } else {
            var deck = script.deckFromGroup(group);
            this.cycleEditMode(deck);
        }
    }
}



// Vinyl button ON/OFF
BehringerCMDStudio2a.vinylButtonPush = function (channel, control, value, status, group) {
    if (value === 127) { // Button pushed
        this.vinylButton = !this.vinylButton; //opposite states
        if (this.vinylButton){
            midi.sendShortMsg(0x90, 0x22, this.colours.on);
        } else {
            midi.sendShortMsg(0x90, 0x22, this.colours.off);
        }
    }
}



// Mode button ON/OFF
BehringerCMDStudio2a.modeButtonPush = function (channel, control, value, status, group) {
    // FIXME
    //print('modeButtonPush: ch ' + channel + ', con ' + control + ', val ' + value + ', status ' + status + ', group ' + group);
    if (value === 127 ) { // Button pushed
        if (this.holdToModeShift) {
            this.setModeShift(true);
        } else if (this.modeLock) {
            this.setModeShift(false); // locked -> reset to unshifted
        } else if (this.modeShift) {
            this.setModeLock(true); // shifted -> locked
        } else {
            this.setModeShift(true); // unshifted -> shifted
        }
    } else { // Button release
        if (this.holdToModeShift) {
            this.setModeShift(false);
        }
    }
}


//Folder button behaviour
BehringerCMDStudio2a.folderButtonPush = function (channel, control, value, status, group) {
        if (BehringerCMDStudio2a.folderButton){
                engine.setValue(group, "ToggleSelectedSidebarItem",1); // expand/collapse view
        } else {
                BehringerCMDStudio2a.folderButton = true;
                midi.sendShortMsg(0x90, 0x25, this.colours.on); // Folder button led ON
                BehringerCMDStudio2a.fileButton = false;
                midi.sendShortMsg(0x90, 0x26, this.colours.off); // File button led OFF
                // focus on folder view
        }
}



//File button behaviour
BehringerCMDStudio2a.fileButtonPush = function (channel, control, value, status, group) {
        if (BehringerCMDStudio2a.fileButton){ // Page Down files
        } else {
                BehringerCMDStudio2a.folderButton = false;
                midi.sendShortMsg(0x90, 0x25, this.colours.off); // Folder button led OFF
                BehringerCMDStudio2a.fileButton = true;
                midi.sendShortMsg(0x90, 0x26, this.colours.on); // File button led ON
                // focus on file view
        }
}



// Up button behaviour (folder/file depending)
BehringerCMDStudio2a.upButtonPush = function (channel, control, value, status, group) {
    if (BehringerCMDStudio2a.folderButton) { // Folder mode
        engine.setValue(group,"SelectPrevPlaylist",1);
    } else { // File mode
        // Act as though mode lock is ON for convenience
        if (!this.modeShift) { // Mode shift is OFF
            engine.setValue(group,"SelectPrevTrack",1); // Up one by one
        } else { // Mode shift is ON
            engine.setValue(group,"SelectTrackKnob",-10); // Up ten by ten
        }
    }
}



// Down button behaviour (folder/file depending)
BehringerCMDStudio2a.downButtonPush = function (channel, control, value, status, group) {
    if (BehringerCMDStudio2a.folderButton) { // Folder mode
        engine.setValue(group,"SelectNextPlaylist",1);
    } else { // File mode
        // Act as though mode lock is ON for convenience
        if (!this.modeShift) { // Mode shift is OFF
            engine.setValue(group,"SelectNextTrack",1); // Down one by one
        } else { // Mode shift is ON
            engine.setValue(group,"SelectTrackKnob",10); // Down ten by ten
        }
    }
}



// Speed/Loop controls
// Minus buttons
BehringerCMDStudio2a.minusButtonPush = function (channel, control, value, status, group) {
    var canal = script.deckFromGroup(group)-1;

    BehringerCMDStudio2a.minusPlusPushed[0][canal] = (value === 127);

    if (!this.modeShifted()) {
        // Not mode Shift
        if (this.editMode[canal] === this.editModes.loop) {
            // loop mode
            if (value === 127) {
                //Button push
                engine.setValue(group,"loop_in",1);
            } else {
                // Button release
                engine.setValue(group,"loop_in",0);
            }
        } else {
            // Speed (tempo) mode
            if (value === 127) {
                // Button push
                if (BehringerCMDStudio2a.minusPlusPushed[1][canal]) {
                    // Plus button is pushed too
                    engine.setValue(group,"rate",0); // Reset slider
                } else {
                    engine.setValue(group,"rate_temp_down",1);
                }
            } else {
                // Button release
                BehringerCMDStudio2a.minusPlusPushed[0][canal] = false;
                engine.setValue(group,"rate_temp_down",0);
            }
        }
    } else {
        // Mode Shifted
        // Beatjump backwards
        if (value === 127) {
            engine.setValue(group,"beatjump_backward", 1);
        }
    }
}



// Plus buttons
BehringerCMDStudio2a.plusButtonPush = function (channel, control, value, status, group) {
    var canal = script.deckFromGroup(group)-1;

    BehringerCMDStudio2a.minusPlusPushed[1][canal] = (value === 127);

    if (!this.modeShifted()) {
        // Not mode Shift
        if (this.editMode[canal] === this.editModes.loop) {
            // loop mode
            if (value === 127) {
                //Button push
                engine.setValue(group,"loop_out",1);
            } else {
                // Button release
                engine.setValue(group,"loop_out",0);
            }
        } else {
            // Speed (tempo) mode
            if (value === 127) {
                // Button push
                if (BehringerCMDStudio2a.minusPlusPushed[0][canal]) {
                    // Plus button is pushed too
                    engine.setValue(group,"rate",0); // Reset slider
                } else {
                    engine.setValue(group,"rate_temp_up",1);
                }
            } else {
                // Button release
                BehringerCMDStudio2a.minusPlusPushed[1][canal] = false;
                engine.setValue(group,"rate_temp_up",0);
            }
        }
    } else {
        // Mode Shifted
        // Beatjump backwards
        if (value === 127) {
            engine.setValue(group,"beatjump_forward", 1);
        }
    }
}


// Hotcue buttons. Edit mode: OFF is 1-4, INTROOUTRO: 5-8.
BehringerCMDStudio2a.hotCueButtons = function (channel, control, value, status, group) {
    if (value === 127) { // Button pushed
        var deck = script.deckFromGroup(group);
        // Hotcue buttons on left deck go from 0x0A to 0x0D, on right deck from 0x3A to 0x3D.
        var button = control - (deck === 1 ? 0x09 : 0x39);

        if (this.editMode[deck - 1] === this.editModes.loop) {
            // Edit mode LOOP: beatloops 1/4 to 1
            engine.setValue(group, "beatloop_" + this.beatLoops[button - 1] + "_toggle", 1);
        } else {
            // Edit mode OFF: use hotcues 1-4
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
    }
}


// Sample buttons. Depending on edit mode: Used to control samples or the intro/outro markers.
BehringerCMDStudio2a.sampleButtons = function (channel, control, value, status, group) {
    if (value === 127) { // Button pushed
        var deck = control < 0x13 ? 1 : 2;
        // Sampler buttons on left deck go from 0x0E to 0x12, on right from 0x3E to 0x41
        var button = control - (deck === 1 ? 0x0D : 0x3D);
        if (button > 2) button--; // Buttons 2-3 have a gap between.

        if (this.editMode[deck - 1] === this.editModes.off) {
            // Edit mode OFF: play samples

            if (!this.modeShifted()) {
                engine.setValue(group, "start_play", 1); // If not mode shift, play from start.
            } else {
                engine.setValue(group, "start_stop", 1); // Else, stop and go to start.
            }
        } else if (this.editMode[deck - 1] === this.editModes.loop) {
            // Edit mode LOOP: beatloops 2 to 16
            group = deck === 1 ? '[Channel1]' : '[Channel2]';
            engine.setValue(group, "beatloop_" + this.beatLoops[button + 3] + "_toggle", 1);
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



// Cue buttons, Mode depending
BehringerCMDStudio2a.cue = function (channel, control, value, status, group) {

	if (value === 127 && this.modeShifted()) { // Mode is ON.
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
BehringerCMDStudio2a.wheelTouch = function (channel, control, value, status, group) {
    var deck = script.deckFromGroup(group);
    //channel = channel+1;
    if (BehringerCMDStudio2a.vinylButton && value > 0) {
        // Vinyl button is ON and we touch the wheel.
        var alpha = 1.0/8;
        var beta = alpha/32;
        engine.scratchEnable(deck, 128, 33+1/3, alpha, beta);
    } else {
        // Vinyl button is OFF.
        engine.scratchDisable(deck);
    }
}


BehringerCMDStudio2a.wheelTurn = function (channel, control, value, status, group) {
    //var deck = channel+1;
    var deck = script.deckFromGroup(group);
    var deck_array = deck-1;
    var newValue = value-64;
    if (engine.isScratching(deck)) {
        newValue *= BehringerCMDStudio2a.scratchSensitivity[this.modeShift ? 1 : 0];
        engine.scratchTick(deck, newValue);  // Scratch!
    } else {
        engine.setValue(group, "jog", newValue); // Jog.
    }
}


// Load Deck buttons. Loads to deck, or if mode-shifted clones other deck.
BehringerCMDStudio2a.loadDeck = function (channel, control, value, status, group) {
    if (value === 127) { // Button pushed
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
BehringerCMDStudio2a.debugColour = 0x00;

BehringerCMDStudio2a.debugLEDs = function () {
    BehringerCMDStudio2a.debugColour++;

// 0x00 off (red)
// 0x01 on (blue, or green for play)
// 0x02 blink

    var controls = [
        0x08, // Assign A A
        0x09, // Assign A B
        0x38, // Assign B A
        0x39, // Assign B B
        0x01, // Cue A
        0x31, // Cue B
        0x02, // Play A
        0x32, // Play B
        0x16, // PFL A
        0x46, // PFL B

        0x22, // vinyl
        0x23, // mode
        0x25, // Folder
        0x26, // File
        0x24, // Up Button
        0x27, // Down Button

        0x04, // Sync A
        0x34, // Sync B

        0x0E, // Sampler A 1
        0x0F, // Sampler A 2
        0x11, // Sampler A 3
        0x12, // Sampler A 4
        0x3E, // Sampler B 1
        0x3F, // Sampler B 2
        0x41, // Sampler B 3
        0x42, // Sampler B 4

        0x0A, // Hotcue A 1
        0x0B, // Hotcue A 2
        0x0C, // Hotcue A 3
        0x0D, // Hotcue A 4
        0x3A, // Hotcue B 1
        0x3B, // Hotcue B 2
        0x3C, // Hotcue B 3
        0x3D, // Hotcue B 4

        0x07, // Plus A
        0x06, // Minus B
        0x37, // Plus B
        0x36, // Minus B

        0x17, // Load A
        0x47, // Load B
    ];

    controls.forEach(function (control) {
        midi.sendShortMsg(0x90, control, BehringerCMDStudio2a.debugColour);
    });
}
