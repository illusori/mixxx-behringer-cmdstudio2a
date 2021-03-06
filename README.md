# Behringer CMD Studio 2a controller

Updated controller mappings for Mixxx for the Behringer CMD Studio 2a controller.

Placeholder repo until I update it for merge to upstream.

# Control scheme

Based off https://github.com/mixxxdj/mixxx/wiki/behringer_cmd_studio_2a, refer to those docs for a starter.

## Additional changes

### Preferences File

Preferences have been split into a separate file `Behringer-CMDStudio2a-Enhanced-preferences.js`. If you take a copy of this file and install it to `~/.mixxx/controllers` then any edits you make will persist through version upgrades. This avoids you needing to edit the file every time the controller defintion is updated.

As new options are added you'll have sensible defaults, but if you want to change an option added since you copied the file, you'll either need to copy the option in yourself, or take a fresh copy and make your changes by hand again.

### Shift Mode configuration

The MODE button has changed from the orginal mapping to enable a more traditional "shift is only active while you hold the MODE key down" behaviour.

If you wish it to return to the old default where the MODE button uses "press once to enable mode-shift for the next command, or press twice to enable mode-shift lock", you can set `holdToModeShift` value in the preferences file to `true`.

### Jog Wheel sensitivity

In vinyl mode the top of the jog wheels enable scratching, and when MODE SHIFTED they'll function at 10x sensitivity to let you scrub through a track quickly.

You can also edit the jog wheel sensitivity in the preferences file if you need to.

### Headphone Volume is Headphone Mix

Personal preference, I use a fader on my headphones, so I find it more useful to have the Headphone Volume knob control the Headphone Mix instead. You can set this back in the bindings. As of yet you can't set this within the preferences file.

### Vinyl Mode

By default the decks now start in vinyl mode, if you'd rather start in CD mode like the original controller mapping you can change the `startInVinylMode` option in the preferences file to `false`.

### Deck Cloning

Load A/Load B work as normal without the mode-shift key active. If you have mode-shift or mode-lock enabled then Load A/Load B will clone the playing track into deck A or B. (Deck cloning loads the cloned deck and sets it playing from the same point/bpm/etc.)

### Load To Inactive Deck

Pressing the File button with a track selected will load it into the first available stopped deck.

### Track Previewing

Pressing the File button while mode-shift is active will start previewing the currently selected track, or stop the current preview from playing.

You can stop the preview deck from automatically opening and closing as you do this by setting `autoOpenPreviewDeck` to `false` in the preferences file.

### Beat Jumping

With mode-shift or mode-lock active the plus/minus buttons will beatjump forwards or backwards by the beatjump amount. This takes priority over other uses of the plus/minus buttons.

### Assign A button

The *Assign A* button is now an "edit mode" switch that cycles between three editing modes:

* First is "sample" editing mode, with red LED.
* Second is "loop" editing mode with blue LED.
* This is "intro-outro" editing mode with flashing red/blue LED.

If you want to change the order of the "edit modes", you can do this in the `editModes` section of the preferences file. You can also customize the `startInEditMode` to pick which edit mode to start in when you fire up Mixxx.

#### Sample editing mode.

* The hotcue buttons give access to hotcues 1-4.
* The sample buttons give access to sample banks 1-4.

This is the default behaviour from the old controller mapping.

#### Loop editing mode

* Assign B toggles loop enabled. (This applies to all modes, not just loop editing mode.)
* Plus/minus control loop in/loop out markers.
* The hotcue buttons and sample buttons become beatloop buttons, or when you mode-shift with the mode button they will alter the beatjump size instead. From the top: fractional beats on the left from 1/8 to 1, and multiple-beat loops on the right from 2 to 16.

#### Intro-Outro editing mode (aka: "prepare" mode)

* The hotcue buttons now grant access to hotcues 5-8 instead of 1-4.
* The sampler buttons now activate intro-start and intro-end on 1 and 2; and outro-start and outro-end on 3 and 4. If you mode-shift with the mode button it will clear the markers.

Intent of this mode is to help you prepare or cue up a track.

How you make use of the hotcues is up to you, but I like to stick the start/end of the beat or the melody (whichever makes sense for the track) on hotcue 5 and 7, and colour them Green for Groove; then stick start/end vocals on 6 and 8, colouring them Violet for Vocals.