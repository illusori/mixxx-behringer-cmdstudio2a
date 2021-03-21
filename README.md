# Behringer CMD Studio 2a controller

Updated controller mappings for Mixxx for the Behringer CMD Studio 2a controller.

Placeholder repo until I update it for merge to upstream.

# Control scheme

Based off https://github.com/mixxxdj/mixxx/wiki/behringer_cmd_studio_2a, refer to those docs for a starter.

## Additional changes

### Jog Wheel sensitivity

In vinyl mode the top of the jog wheels enable scratching, and when MODE SHIFTED they'll function at 10x sensitivity to let you scrub through a track quickly.

You can also edit the jog wheel sensitivity in the top of the `Behringer-CMDStudio2a-Enhanced-scripts.js` file if you need to.

### Headphone Volume is Headphone Mix

Personal preference, I use a fader on my headphones, so I find it more useful to have the Headphone Volume knob control the Headphone Mix instead. You can set this back in the bindings.

### Deck Cloning

Load A/Load B work as normal without the mode-shift key active. If you have mode-shift or mode-lock enabled then Load A/Load B will clone the playing track into deck A or B. (Deck cloning loads the cloned deck and sets it playing from the same point/bpm/etc.)

### Beat Jumping

With mode-shift or mode-lock active the plus/minus buttons will beatjump forwards or backwards by the beatjump amount. This takes priority over other uses of the plus/minus buttons.

### Assign A button

The *Assign A* button is now an "edit mode" switch that cycles between three editing modes:

* First is "off" with red LED, controller functions are unchanged.
* Second is "loop" editing mode with blue LED.
* This is "intro-outro" editing mode with flashing red/blue LED.

#### Loop editing mode

* Assign B toggles loop enabled. (This applies to all modes, not just loop editing mode.)
* Plus/minus control loop in/loop out markers.
* The hotcue buttons and sample buttons become beatloop buttons. From the top: fractional beats on the left from 1/8 to 1, and multiple-beat loops on the right from 2 to 16.

#### Intro-Outro editing mode

* The hotcue buttons now grant access to hotcues 4-8 instead of 1-4.
* The sampler buttons now activate intro-start and intro-end on 1 and 2; and outro-start and outro-end on 3 and 4. If you mode-shift with the mode button it will clear the markers.
