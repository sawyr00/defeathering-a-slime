# SlimeBallSummer Web Player

This folder is the browser rebuild of `WBP_MusicPlayerSkin`.

The Unreal assets remain untouched. The portable web player reads all runtime media from its own `./Content` folder, so the complete `WebPlayer` folder can be moved without changing asset paths.

## Native Layout

- `RootSizeBox`: `1400 x 1400`
- `PlayerAssembly`: `1080 x 1080`
- `PlayerAssembly` position inside `RootSizeBox`: `160, 160`
- `VisualizerMaskPanel`: `290 x 290`
- `VisualizerMaskPanel` position inside `RootSizeBox`: approximately `555, 525.536`
- `NPSkinRoot`: `432 x 432`
- `NPSkinRoot` position inside `RootSizeBox`: `484, 484`
- `NPSkinRoot` render translation start: `0, 0`
- `NPSkinRoot` render translation out/resting position: `0, -444`
- `NPSkinRoot` render translation peak position: `0, -480`
- `NPTrackTextMask`: visual web rectangle `128.5, 194.25, 175 x 43.5` inside `NPSkinRoot`

The full browser stage must stay `1400 x 1400` because `NPSkinRoot` needs room to move above the centered player area.

## Asset Rule

Keep the original large PNG and WAV files as source files. Do not ship the raw source folders directly.

Visualizer media should be resized or converted only large enough to fill the `VisualizerMaskPanel` without stretching upward. The first conversion target should be based on the `290 x 290` hatch view plus margin and high-DPI allowance.

## Current Web Rebuild Status

- `index.html` creates the browser player shell.
- `src/player-config.js` records the verified native layout, source asset paths, audio paths, playlists, hit mask paths, and first known animation sequences.
- `src/main.js` builds the `1400 x 1400` player stage, scales it responsively, loads the front skin, hatch, audio buttons, play/pause button, NP skin, NP text mask, Trackslimes, BB Network Ring, Skeleton Arm, first visualizer frame, and alpha-mask click areas.
- Play/pause, next, previous, BB hatch, sign/Trackslimes extend-retract, BB Network Ring appear-loop-retract, and Skeleton Arm skin-mode toggle are represented in web code.
- The Unreal project file, Unreal source files, Blueprints, maps, and assets are not edited by this web rebuild.

## Known Exact-Parity Work Still Needed

- Convert visualizer sequences into web-ready media sized for the `290 x 290` hatch window.
- Add exact rotating-side behavior, including the side-specific static skins and side hit areas.
- Compare Trackslimes frame timing against the live Unreal widget.
- Compare BB Network Ring loop/retract timing against the live Unreal widget.
- Add the missing player spin/stretch transition that happens after Skeleton Arm and before final black-and-white/default mode settling.
- Add exact CD, tape, and umbrella behavior after their Unreal behavior is mapped.
- Finish exact scrolling Now Playing text timing against the live widget tick behavior.
