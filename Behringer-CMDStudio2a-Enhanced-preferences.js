// Edit your preferences here and copy into your .mixxx/controllers directory.
// It should then merge in with the defaults with any new version of the controller script.
var BehringerCMDStudio2aPreferences = {
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
        sample:     'blink',
        loop:       'blue',
        introoutro: 'red',
    },

    // What edit mode to start in.
    // Value values are: off, loop, introoutro.
    startInEditMode: 'introoutro',

    // Whether to start with vinyl mode enabled or not.
    startInVinylMode: true,

    // Whether to automatically open the preview deck when previewing with shift-FILE.
    autoOpenPreviewDeck: true,

    // Whether to automatically enable/disable keylock during rate changes.
    autoKeyLock: true,
};
