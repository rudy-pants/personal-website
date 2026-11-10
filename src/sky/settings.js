// The values you're most likely to want to adjust. Sizes are fractions of the
// screen height, times are in seconds.
export const SETTINGS = {
  horizon: { desktop: 0.30, phone: 0.40 },        // height of the horizon on the first screen
  atmosphere: { desktop: 0.72, phone: 0.50 },     // thickness of the coloured band
  curvature: 0.045,                               // how much the horizon bends
  openingSeconds: 3.6,                            // sun blink and spread on first load
  climbSeconds: 1.9,                              // home to post
  returnSeconds: 2.2,                             // post back to home
  skyScreens: 3,                                  // screens of sky drawn before the page turns plain dark
  maxPixelRatio: 1.5,                             // lower this to trade sharpness for speed
  idleFrameMs: 31,                                // redraw rate while nothing is happening (31 is about 30 fps)
};
