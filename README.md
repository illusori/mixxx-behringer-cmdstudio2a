# Behringer CMD Studio 2a controller

Updated controller mappings for Mixxx for the Behringer CMD Studio 2a controller.

Placeholder repo until I update it for merge to upstream.

# Control scheme

Based off https://github.com/mixxxdj/mixxx/wiki/behringer_cmd_studio_2a, refer to those docs for a starter.

## Additional changes

### Headphone Volume is Headphone Mix

Personal preference, I use a fader on my headphones, so I find it more useful to have the Headphone Volume knob control the Headphone Mix instead. You can set this back in the bindings.

### Assign A button

The *Assign A* button is now an "edit mode" switch that cycles between three editing modes:

* First is "off" with red LED, controller functions are unchanged.
* Second is "loop" editing mode with blue LED.
* This is "intro-outro" editing mode with flashing red/blue LED.

#### Loop editing mode

* Assign B toggles loop enabled. (This applies to all modes, not just loop editing mode.)
* Plus/minus control loop in/loop out markers. This seems a little buggy to me in 2.3.0, still needs some work.
* The hotcue buttons and sample buttons become beatloop buttons. From the top: fractional beats on the left from 1/8 to 1, and multiple-beat loops on the right from 2 to 16.

#### Intro-Outro editing mode

* The hotcue buttons now grant access to hotcues 4-8 instead of 1-4.
* The sampler buttons now activate intro-start and intro-end on 1 and 2; and outro-start and outro-end on 3 and 4. If you mode-shift with the mode button it will clear the markers.
