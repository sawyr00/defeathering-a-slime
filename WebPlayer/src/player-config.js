window.SlimeBallPlayerConfig = {
  assetRoot: "./Content",
  assetVersion: "20260808-mobile-7",
  mobileAssets: {
    mediaQuery: "(max-width: 900px)",
    root: "WebPlayerOptimized/Mobile",
    sourcePrefixes: ["Images/static/", "buttons/", "hatch/", "rotation/", "Sequences/"],
    sourceExclusions: ["buttons/masks/", "rotation/rotation click areas/"],
    targetSize: 720,
    layout: {
      edgeInset: 10,
      anchor: { x: 700, y: 670.536127 },
      visibleBounds: { left: 341, top: 156, right: 1106, bottom: 1199 }
    }
  },
  frameRate: {
    defaultFramesPerSecond: 60,
    blackAndWhiteFramesPerSecond: 10,
    blackAndWhiteSparseFramesPerSecond: 16,
    skeletonArmFramesPerSecond: 30,
    visualizerFramesPerSecond: 30,
    bbNetworkRingRetractMultiplier: 5
  },
  stage: {
    width: 1400,
    height: 1400
  },
  playerAssembly: {
    x: 160,
    y: 160,
    width: 1080,
    height: 1080
  },
  visualizerMaskPanel: {
    x: 555,
    y: 525.536127,
    width: 290,
    height: 290,
    source: "WBP_MusicPlayerSkin -> VisualizerMaskPanel",
    clipping: "ClipToBounds",
    pbjImage: {
      x: -30,
      y: -10.795004,
      width: 350,
      height: 350,
      renderTranslation: { x: 0, y: -25 },
      source: "PBJSLIMEVisualizerImage"
    },
    slimeBeachImage: {
      x: -85.399994,
      y: 18.373608,
      width: 460.799988,
      height: 294.959991,
      renderTranslation: { x: 0, y: -25 },
      source: "WBP_MusicPlayerSkin -> SlimeBeachImage"
    },
    slimeSpreadImage: {
      x: 1.425411,
      y: 37.55485,
      width: 295.598846,
      height: 274.790405,
      renderTranslation: { x: 0, y: -25 },
      source: "WBP_MusicPlayerSkin -> SlimeSpreadImage"
    },
    discmanBottomImage: {
      x: -2.906937,
      y: 2.276001,
      width: 295,
      height: 295,
      opacity: 0.75,
      src: "Images/static/discman-backing2.png",
      source: "WBP_MusicPlayerSkin -> DiscmanBottomImage"
    },
    cdDiscImage: {
      x: -382.5,
      y: -325.872715,
      width: 1055,
      height: 1055,
      renderTranslation: { x: 0, y: -25 },
      source: "WBP_MusicPlayerSkin -> CDDISCTILTPANEL -> CDDiscImage"
    },
    discmanWindowOverlay: {
      x: 568.408203,
      y: 517.596069,
      width: 264.862823,
      height: 290,
      opacity: 0.75,
      src: "Images/static/discmanglassoverlay.png",
      source: "WBP_MusicPlayerSkin -> DiscmanWindowOverlay_1"
    },
    blackAndWhiteImage: {
      x: -0.011718,
      y: 23.863903,
      width: 280,
      height: 280,
      renderTranslation: { x: 0, y: -25 },
      source: "BlackAndWhiteVisualizerImage"
    },
    blackAndWhiteBackground: {
      x: -53.482643,
      y: -16.290916,
      width: 381.599976,
      height: 357.200012,
      backgroundColor: "#000",
      source: "BlackAndWhiteVisualizerBackgroundImage"
    },
    blackAndWhiteStaticOverlay: {
      x: -7.511718,
      y: 16.363903,
      width: 295,
      height: 295,
      renderTranslation: { x: 0, y: -25 },
      source: "BlackAndWhiteStaticOverlayImage"
    }
  },
  npSkinRoot: {
    x: 484,
    y: 484,
    width: 432,
    height: 432,
    playerAssemblyX: 324,
    playerAssemblyY: 324,
    source: "WBP_MusicPlayerSkin -> NPSkinRoot",
    skinImage: {
      x: 56,
      y: 56,
      width: 320,
      height: 320,
      source: "Accepted player_demo_video npSkinLayer: 1080 * 0.333 at PlayerAssembly + 360"
    },
    movement: {
      start: { x: 0, y: 0 },
      out: { x: 0, y: -444 },
      peak: { x: 0, y: -480 },
      progressStep: 0.08,
      hoverTimeStep: 0.1,
      hoverAmplitude: 8,
      source: "EventGraph NpSkinStartPosition/NpSkinOutPosition/NpSkinPeakPosition"
    },
    trackText: {
      mask: {
        x: 113.33,
        y: 196.67,
        width: 180.44,
        height: 38.67,
        source: "NPTrackTextMask 100 x 30, render scale 1.75 x 1.45"
      },
      startX: 70,
      scrollSpeed: 0.75,
      loopGap: 126,
      textScale: { x: 0.46, y: 0.52 },
      mobileTranslationY: 4,
      glowTranslation: { x: 0, y: 0 },
      color: "rgb(255, 6, 40)",
      fontSize: 52,
      fontSource: "/Game/fonts/Credit_Block_extra_condensed_Font",
      window: {
        src: "Images/static/glass_0d4.png",
        opacity: 0.75,
        renderTranslation: { x: 0, y: 77 },
        displayScale: 1,
        sourceSize: { width: 1080, height: 1080 },
        sourceBounds: { x: 329, y: 304, width: 422, height: 370 },
        source: "NP text mask glass uses the centered visible hatch-window bounds from Images/static/glass_0d4.png"
      },
      source: "NPTrackText, NPTrackTextGlow, NPTrackTextLoopCopy, NPTrackTextLoopCopyGlow"
    }
  },
  hitMasks: {
    playPause: "buttons/masks/Button-PlayPause-[mask].png",
    previous: "buttons/masks/Button-Prev-[mask].png",
    next: "buttons/masks/Button-Next-[mask].png",
    bbButton: "buttons/masks/Button-BB-[mask].png",
    signButton: "buttons/masks/Sign-Hit-[Mask].png",
    bbNetworkRingButton: "buttons/masks/DTGlogohit-[mask].png",
    skeletonArmButton: "buttons/masks/MilkCarton(arm)Hanging[mask].png",
    cdButton: "buttons/masks/CD-hit[mask].png",
    tapeButton: "buttons/masks/TapeHit[mask].png",
    umbrellaButton: "buttons/masks/Umbrella-Hit-[mask].png"
  },
  hitAreas: {
    playPause: { x: 304, y: 588, width: 34.295715, height: 36.789268, angle: -16, source: "PP_button" },
    previous: { x: 292, y: 540, width: 34.435513, height: 36.789268, angle: 0, source: "Prev_Button" },
    next: { x: 288, y: 496, width: 30.947039, height: 36.789268, angle: 0, source: "Next_Button" },
    bbButton: { x: 512, y: 744, width: 51.857735, height: 36.789268, angle: 0, source: "BB_button" },
    signButton: { x: 660, y: 180, width: 59.741238, height: 49.535725, angle: 42, source: "Sign_Button" },
    bbNetworkRingButton: { x: 324, y: 216, width: 241.046921, height: 85.96228, angle: 155, source: "BBNETWORKRING_BUTTON" },
    skeletonArmButton: { x: 299, y: 544, width: 452, height: 220, angle: 0, source: "Skeleton arm resting motion area" },
    cdButton: { x: 652, y: 284, width: 34.610249, height: 44.699623, angle: 54, source: "CD_Button" },
    umbrellaButton: { x: 852, y: 280, width: 25.104282, height: 181.070206, angle: 62, source: "Umbrella_button" }
  },
  rotationControls: [
    { id: "rotate_front_left", from: "front", to: "left", transition: "front_left", mask: "rotation/rotation click areas/FRONT VIEW CLICKS/FRONTSIDE to LEFTSIDE.png", hitArea: { x: 182, y: 343, width: 131, height: 319 } },
    { id: "rotate_front_right", from: "front", to: "right", transition: "front_right", mask: "rotation/rotation click areas/FRONT VIEW CLICKS/FRONTSIDE to RIGHTSIDE.png", hitArea: { x: 754, y: 383, width: 100, height: 317 } },
    { id: "rotate_front_top", from: "front", to: "top", transition: "front_top", mask: "rotation/rotation click areas/FRONT VIEW CLICKS/FRONTSIDE to TOPSIDE.png", hitArea: { x: 555, y: 271, width: 101, height: 45 } },

    { id: "rotate_left_back", from: "left", to: "back", transition: "left_back", mask: "rotation/rotation click areas/LEFT VIEW CLICKS/LEFTSIDE to BACKSIDE.png", hitArea: { x: 210, y: 360, width: 113, height: 351 } },
    { id: "rotate_left_front", from: "left", to: "front", transition: "left_front", mask: "rotation/rotation click areas/LEFT VIEW CLICKS/LEFTSIDE to FRONTSIDE.png", hitArea: { x: 755, y: 332, width: 78, height: 357 } },
    { id: "rotate_left_top", from: "left", to: "top", transition: "left_top", mask: "rotation/rotation click areas/LEFT VIEW CLICKS/LEFTSIDE to TOPSIDE.png", hitArea: { x: 379, y: 186, width: 334, height: 139 } },

    { id: "rotate_right_back", from: "right", to: "back", transition: "right_back", mask: "rotation/rotation click areas/RIGHT VIEW CLICKS/RIGHT to BACKSIDE.png", hitArea: { x: 707, y: 294, width: 130, height: 362 } },
    { id: "rotate_right_front", from: "right", to: "front", transition: "right_front", mask: "rotation/rotation click areas/RIGHT VIEW CLICKS/RIGHT to FRONTSIDE.png", hitArea: { x: 247, y: 331, width: 107, height: 363 } },
    { id: "rotate_right_top", from: "right", to: "top", transition: "right_top", mask: "rotation/rotation click areas/RIGHT VIEW CLICKS/RIGHT to TOPSIDE.png", hitArea: { x: 353, y: 134, width: 253, height: 219 } },

    { id: "rotate_back_left", from: "back", to: "left", transition: "back_left", mask: "rotation/rotation click areas/BACK VIEW CLICKS/BACK to LEFT SIDE.png", hitArea: { x: 743, y: 373, width: 108, height: 352 } },
    { id: "rotate_back_right", from: "back", to: "right", transition: "back_right", mask: "rotation/rotation click areas/BACK VIEW CLICKS/BACK to RIGHT SIDE.png", hitArea: { x: 225, y: 422, width: 100, height: 239 } },
    { id: "rotate_back_top", from: "back", to: "top", transition: "back_top", mask: "rotation/rotation click areas/BACK VIEW CLICKS/BACK to TOP SIDE.png", hitArea: { x: 320, y: 199, width: 330, height: 167 } },

    { id: "rotate_top_back", from: "top", to: "back", transition: "top_back", mask: "rotation/rotation click areas/TOP VIEW CLICKS/TOP to BACK.png", hitArea: { x: 329, y: 227, width: 381, height: 141 } },
    { id: "rotate_top_front", from: "top", to: "front", transition: "top_front", mask: "rotation/rotation click areas/TOP VIEW CLICKS/TOP to FRONT.png", hitArea: { x: 343, y: 743, width: 392, height: 68 } },
    { id: "rotate_top_left", from: "top", to: "left", transition: "top_left", mask: "rotation/rotation click areas/TOP VIEW CLICKS/TOP to LEFTSIDE.png", hitArea: { x: 213, y: 366, width: 150, height: 263 } },
    { id: "rotate_top_right", from: "top", to: "right", transition: "top_right", mask: "rotation/rotation click areas/TOP VIEW CLICKS/TOP to RIGHTSIDE.png", hitArea: { x: 730, y: 382, width: 144, height: 341 } }
  ],
  rotationTransitions: {
    front_left: { folderName: "_rotate counterclockwise_90", firstFrame: "0120.png", lastFrame: "0150.png" },
    left_front: { folderName: "_rotate counterclockwise_90", firstFrame: "0120.png", lastFrame: "0150.png", reverse: true },
    left_back: { folderName: "_rotate counterclockwise_90+90", firstFrame: "0150.png", lastFrame: "0180.png" },
    back_left: { folderName: "_rotate counterclockwise_90+90", firstFrame: "0150.png", lastFrame: "0180.png", reverse: true },
    back_right: { folderName: "_rotate counterclockwise_90+90+90", firstFrame: "0180.png", lastFrame: "0210.png" },
    right_back: { folderName: "_rotate counterclockwise_90+90+90", firstFrame: "0180.png", lastFrame: "0210.png", reverse: true },
    right_front: { folderName: "_rotate counterclockwise_90+90+90+90", firstFrame: "0210.png", lastFrame: "0240.png" },
    front_right: { folderName: "_rotate counterclockwise_90+90+90+90", firstFrame: "0210.png", lastFrame: "0240.png", reverse: true },
    front_top: { folderName: "_rotate foward_top", firstFrame: "0240.png", lastFrame: "0270.png" },
    top_front: { folderName: "_rotate foward_top", firstFrame: "0240.png", lastFrame: "0270.png", reverse: true },
    top_back: { folderName: "_rotate foward_top+backside", firstFrame: "0270.png", lastFrame: "0300.png" },
    back_top: { folderName: "_rotate foward_top+backside", firstFrame: "0270.png", lastFrame: "0300.png", reverse: true },
    top_left: { folderName: "_rotate_top_leftside", firstFrame: "0330.png", lastFrame: "0360.png" },
    left_top: { folderName: "_rotate_top_leftside", firstFrame: "0330.png", lastFrame: "0360.png", reverse: true },
    top_right: { folderName: "_rotate_top_rightside", firstFrame: "0390.png", lastFrame: "0420.png" },
    right_top: { folderName: "_rotate_top_rightside", firstFrame: "0390.png", lastFrame: "0420.png", reverse: true }
  },
  layers: {
    frontSkin: "Images/static/Front [no buttons] single frame.png",
    frontSkinBlackAndWhite: "Images/static/Front [no buttons] single frame-BW.png",
    frontAudioButtons: "Images/static/FrontFace_AudioButtons_Static.png",
    hatchClosed: "Images/static/FrontFace_Hatch_Closed.png",
    hatchOpen: "Images/static/FrontFace_Hatch_Open.png",
    hatchWindow: "Images/static/glass_0d4.png",
    hatchClosedBlackAndWhite: "Images/static/FrontFace_Hatch_Closed-BW.png",
    hatchOpenBlackAndWhite: "Images/static/FrontFace_Hatch_Open-BW.png",
    playPausePressed: "Images/static/FrontFace_PlayPauseButton_Pressed.png",
    playPauseUnpressed: "Images/static/FrontFace_PlayPauseButton_Unpressed.png",
    npSkin: "Images/static/NP_SKIN.png",
    npSkinBlackAndWhite: "Images/static/NP_SKIN-BW.png",
    trackslimesResting: "Images/static/Tracks_expanded_Isolated.png",
    sides: {
      left: {
        default: "Images/static/Lefttisde_Static.png",
        blackAndWhite: "Images/static/Lefttisde_Static-BW.png"
      },
      right: {
        default: "Images/static/Rightside_Static.png",
        blackAndWhite: "Images/static/Rightside_Static-BW.png"
      },
      top: {
        default: "Images/static/Topside_Static.png",
        blackAndWhite: "Images/static/Topside_Static-BW.png"
      },
      back: {
        default: "Images/static/Backside_Static.png",
        blackAndWhite: "Images/static/Backside_Static-BW.png"
      }
    }
  },
  audio: {
    backgroundNoise: "Audio/background noise.wav",
    boot: "Audio/player boot up sound.wav",
    bbButton: "Audio/bb-button - Cartoon Splat sound effect.mp3",
    hatchCloseOpen: "Audio/hatchdoors2open+close.wav",
    hatchOpenOnly: "Audio/hatchdoors-openonly.wav",
    playPauseButton: "Audio/button press tiny.mp3",
    nextPreviousButton: "Audio/button press 3.mp3",
    rotation: "Audio/rotationwhoosh2.wav",
    trackslimesOpen: "Audio/trackslimeswhoosh.wav",
    trackslimesRetract: "Audio/trackslimes retract.wav",
    bbNetworkRingAppear: "Audio/bbnetworkringappear.wav",
    bbNetworkRingRetract: "Audio/bbnetworkringretract.wav",
    beaconSound: "Audio/beacon sound.mp3",
    beaconBackground: "Audio/beacon-background.wav",
    skinModeChange: "Audio/skin mode change trashcompactor].wav",
    blackAndWhiteStatic: "Audio/brownnoise.wav"
  },
  playlists: {
    default: [
      "Audio/Tracks/A01 Defeathering A Swan.wav",
      "Audio/Tracks/A02 Don't Be Stupid.wav",
      "Audio/Tracks/A03 Brazil Funk Slam.wav",
      "Audio/Tracks/A04 Ultra Spicy.wav",
      "Audio/Tracks/A05 Slime Gaze.wav",
      "Audio/Tracks/A06 H Slam.wav",
      "Audio/Tracks/A07 Grave Cumbia.wav",
      "Audio/Tracks/A08 Slam Dune.wav",
      "Audio/Tracks/A09 Puddle Of Slime.wav",
      "Audio/Tracks/A10 Every Man's Dream.wav",
      "Audio/Tracks/A11 Lonely Vato Slam.wav",
      "Audio/Tracks/A12 Peanut Butter Jelly Slime.wav",
      "Audio/Tracks/A13 Serving Slime.wav",
      "Audio/Tracks/A14 Bedroom.wav",
      "Audio/Tracks/A15 Mean Face.wav",
      "Audio/Tracks/A16 Quick Sand.wav",
      "Audio/Tracks/A17 Too Tired.wav",
      "Audio/Tracks/A18 It's Easy To Have A Good Time When You Feel Good.wav",
      "Audio/Tracks/A19 Valley Fever.wav",
      "Audio/Tracks/A20 Space Slam.wav",
      "Audio/Tracks/A21 Baby U & I.wav",
      "Audio/Tracks/B22 Sky Fall.wav",
      "Audio/Tracks/B23 Aborgation's Crown.wav",
      "Audio/Tracks/B24 Coming Up.wav",
      "Audio/Tracks/B25 Sinking In.wav",
      "Audio/Tracks/B26 Just Breathe.wav",
      "Audio/Tracks/B27 Slam Dune (Nightcore).wav",
      "Audio/Tracks/B28 Ultra Spicy (Nightcore).wav",
      "Audio/Tracks/B29 Don't Be Stupid (Nightcore).wav",
      "Audio/Tracks/B30 Defeathering A Swan (Nightcore).wav",
      "Audio/Tracks/B31 Slime Gaze (Nightcore).wav",
      "Audio/Tracks/B32 Aborgation's Crown (Nightcore).wav",
      "Audio/Tracks/B34 Every Man's Dream (Nightcore).wav",
      "Audio/Tracks/B35 Baby U & I (Nightcore).wav",
      "Audio/Tracks/B38 Lonely Vato Slam (Nightcore).wav"
    ],
    blackAndWhite: [
      "Audio/BlackAndWhiteMode/B33 Baby U & I (Screwed).wav",
      "Audio/BlackAndWhiteMode/B36 H Slam (Screwed).wav",
      "Audio/BlackAndWhiteMode/B37 Puddle Of Slime (Screwed).wav"
    ]
  },
  sequences: {
    buttons: {
      previous: {
        folder: "buttons/_button_backprevious_press",
        frames: ["0495.png", "0496.png", "0497.png", "0498.png", "0499.png", "0500.png", "0501.png", "0502.png", "0503.png", "0504.png", "0505.png", "0506.png", "0507.png", "0508.png", "0509.png"]
      },
      bbButton: {
        folder: "buttons/_button_BB_press",
        frames: ["0450.png", "0451.png", "0452.png", "0453.png", "0454.png", "0455.png", "0456.png", "0457.png", "0458.png", "0459.png", "0460.png", "0461.png", "0462.png", "0463.png", "0464.png", "0465.png", "0466.png", "0467.png", "0468.png", "0469.png", "0470.png", "0471.png", "0472.png", "0473.png", "0474.png", "0475.png", "0476.png", "0477.png", "0478.png", "0479.png", "0480.png"]
      },
      next: {
        folder: "buttons/_button_fowardnext_press",
        frames: ["0510.png", "0511.png", "0512.png", "0513.png", "0514.png", "0515.png", "0516.png", "0517.png", "0518.png", "0519.png", "0520.png", "0521.png", "0522.png", "0523.png", "0524.png"]
      },
      playPause: {
        folder: "buttons/_button_playpause_pressed-unpressed",
        frames: ["0480.png", "0481.png", "0482.png", "0483.png", "0484.png", "0485.png", "0486.png", "0487.png", "0488.png", "0489.png", "0490.png", "0491.png", "0492.png", "0493.png", "0494.png", "0495.png"]
      }
    },
    hatch: {
      normal: {
        folder: "hatch/regular",
        frames: ["spin 20060.png", "spin 20061.png", "spin 20062.png", "spin 20063.png", "spin 20064.png", "spin 20065.png", "spin 20066.png", "spin 20067.png", "spin 20068.png", "spin 20069.png", "spin 20070.png", "spin 20071.png", "spin 20072.png", "spin 20073.png", "spin 20074.png", "spin 20075.png", "spin 20076.png", "spin 20077.png", "spin 20078.png", "spin 20079.png", "spin 20080.png", "spin 20081.png", "spin 20082.png", "spin 20083.png", "spin 20084.png", "spin 20085.png", "spin 20086.png", "spin 20087.png", "spin 20088.png", "spin 20089.png", "spin 20090.png"]
      },
      blackAndWhite: {
        folder: "hatch/B&W",
        frames: ["spin 20060.png", "spin 20064.png", "spin 20068.png", "spin 20073.png", "spin 20077.png", "spin 20081.png", "spin 20086.png", "spin 20090.png"]
      }
    },
    features: {
      trackslimes: {
        folder: "Sequences/_tracks expand_contract",
        firstFrame: "0630.png",
        lastFrame: "0660.png",
        frameCount: 31
    },
    bbNetworkRing: {
      folder: "Sequences/_bbnetwork ring appear_spin_retract",
      blackAndWhiteFolder: "Sequences/_bbnetwork ring appear spin retract BBW",
      blackAndWhiteSourceFolder: "/Game/Sequences/_bbnetwork_ring_appear_spin_retract_-_BW",
      firstFrame: "0692.png",
        loopStartFrame: "0700.png",
        loopEndFrame: "0940.png",
        lastFrame: "0950.png",
        frameCount: 259
      },
      skeletonArm: {
        folder: "Sequences/_skeletonarmswing",
        firstFrame: "0555.png",
        lastFrame: "0585.png",
        frameCount: 31
      }
    },
    visualizers: {
      defaultSlimeBeach: {
        folder: "WebPlayerOptimized/Visualizers/default skin mode/slime beach",
        sourceFolder: "Visualizers/default skin mode/slime beach",
        firstFrame: "DTG BIG SLIME SUMMER BEACH MOTION0000.webp",
        framePrefix: "DTG BIG SLIME SUMMER BEACH MOTION",
        frameExtension: "webp",
        frameStart: 0,
        frameEnd: 599,
      frameDigits: 4,
      framesPerSecond: 30,
      playback: "loopWhenPlayingHoldWhenPaused",
      layout: "slimeBeachImage",
      motionEase: { inMs: 900, outMs: 900 },
      sourceSize: { width: 1920, height: 1229 },
      sourceFrameCount: 600,
      webTargetSize: { width: 350, height: 350 },
      webTargetRule: "Duplicate web frames are resized to cover the 290 x 290 hatch window without stretching."
    },
    defaultSlimeSpread: {
      folder: "WebPlayerOptimized/Visualizers/default skin mode/slime spread",
      sourceFolder: "Visualizers/default skin mode/slime spread",
      firstFrame: "SLIME SPREAD [feed]_10000.webp",
      framePrefix: "SLIME SPREAD [feed]_",
      frameExtension: "webp",
      frameStart: 10000,
      frameEnd: 10100,
      frameDigits: 5,
      framesPerSecond: 30,
      playback: "loopWhenPlayingHoldWhenPaused",
      layout: "slimeSpreadImage",
      motionEase: { inMs: 900, outMs: 900 },
      sourceSize: { width: 1080, height: 1350 },
      sourceFrameCount: 101,
      webTargetSize: { width: 296, height: 275 },
      webTargetRule: "Duplicate web frames are resized to the WBP_MusicPlayerSkin SlimeSpreadImage slot."
    },
    defaultCDSpin: {
      folder: "WebPlayerOptimized/Visualizers/default skin mode/cd spin",
      sourceFolder: "Visualizers/default skin mode/cd spin",
      firstFrame: "0450.webp",
      framePrefix: "",
      frameExtension: "webp",
      frameStart: 450,
      frameEnd: 510,
      frameDigits: 4,
      framesPerSecond: 30,
      playback: "loopWhenPlayingHoldWhenPaused",
      layout: "cdDiscImage",
      backing: "discmanBottomImage",
      overlay: "discmanWindowOverlay",
      motionEase: { inMs: 900, outMs: 900 },
      sourceSize: { width: 1920, height: 1920 },
      sourceFrameCount: 61,
      webTargetSize: { width: 1055, height: 1055 },
      webTargetRule: "Duplicate web frames are resized to the WBP_MusicPlayerSkin CDDiscImage slot."
    },
    defaultPBJSlime: {
      type: "livePBJ",
      playback: "liveAudioReactive",
      layout: "pbjImage",
      source: "BP_PBJSlimeVisualizer + PBJMetaballComponent",
      framesPerSecond: 30,
      renderResolution: 512,
      audioFrequencies: [80, 160, 320, 640],
      audioGain: 1,
      audioCalibration: {
        noiseFloor: 0.08,
        ceiling: 0.55,
        responseExponent: 0.70
      },
      actor: {
        baseBlobScale: 1,
        blobReactiveScaleAmount: 0.1,
        audioInterpSpeed: 8,
        blobIntensityMultiplier: 0.1
      },
      metaball: {
        gridResolution: 32,
        isoLevel: 0.75,
        boundsExtent: 180,
        mainRadius: 72,
        dropletCount: 7,
        dropletRadius: 50,
        dropletReactiveRadius: 40,
        dropletOrbitRadius: 94,
        baseMotionSpeed: 2,
        audioMotionBoost: 1,
        reactiveReach: 270,
        verticalBaseReach: 94,
        verticalReactiveReach: 270,
        stopMotionFPS: 25,
        audioInterpSpeed: 8,
        updateInterval: 0.033,
        surfaceUVScale: 0.65,
        normalSampleOffset: 3,
        componentScale: 0.175
      },
      capture: {
        cameraLocation: [-180, 0, 0],
        fovAngle: 115,
        source: "BlobCapture"
      },
      lighting: {
        key: { x: -360, y: 260, z: 220, intensity: 430, color: [1, 1, 1] },
        fill: { x: 340, y: -340, z: 130, intensity: 140, color: [1, 1, 1] },
        softFill: { x: 950, y: 900, z: 520, intensity: 145, color: [1, 1, 1] },
        rim: { x: -850, y: -1100, z: 680, intensity: 70, color: [1, 1, 1] },
        frontAccent: { x: -300, y: -210, z: 150, intensity: 340, color: [1, 0.86, 0.8] },
        rearEdge: { x: 430, y: 260, z: 260, intensity: 460, color: [0.76, 0.8, 1] }
      },
      material: {
        fingerprintsTexture: "WebPlayerOptimized/Visualizers/default mode/pbjslime/material/Game/Materials/clay_textures/clay_basic/Fingerprints01_3K.PNG",
        ambientOcclusionTexture: "WebPlayerOptimized/Visualizers/default mode/pbjslime/material/Game/Materials/clay_textures/clay_basic/Clay_001_ambientOcclusion.PNG",
        purpleDark: [0.150709, 0.147401, 0.526042],
        purpleLight: [0.329553, 0.326848, 0.636458],
        redDark: [0.415625, 0.049788, 0.049795],
        redLight: [0.557292, 0.133518, 0.133525],
        roughnessMin: 0.1,
        roughnessMax: 2,
        roughnessContrast: 0,
        specular: 0.5,
        bloomIntensity: 0.675
      },
      webTargetRule: "Live 3D browser implementation of the PBJ metaball component, capture camera, material gradient, lighting, motion, and audio response."
    },
    blackAndWhiteStatic: {
      folder: "WebPlayerOptimized/Visualizers/blackandwhite mode [paused exclusive]/whitenoise",
      sourceFolder: "Visualizers/blackandwhite mode [paused exclusive]/whitenoise",
      firstFrame: "whitenoise000.webp",
      framePrefix: "whitenoise",
      frameExtension: "webp",
      frameStart: 0,
      frameEnd: 59,
      frameDigits: 3,
      framesPerSecond: 30,
      playback: "loopAlways",
      layout: "blackAndWhiteStaticOverlay",
      backing: "blackAndWhiteBackground",
      crossfadeMs: 600,
      staticAudio: true,
      phaseTransition: {
        tickRate: 60,
        displaySwitchTick: 1,
        finishTick: 168,
        toPlaying: [
          { tick: 0, opacity: 0.98 },
          { tick: 16, opacity: 0.62 },
          { tick: 36, opacity: 0.78 },
          { tick: 56, opacity: 0.34 },
          { tick: 84, opacity: 0.52 },
          { tick: 104, opacity: 0.16 },
          { tick: 136, opacity: 0 }
        ],
        toPaused: [
          { tick: 0, opacity: 0 },
          { tick: 16, opacity: 0.38 },
          { tick: 36, opacity: 0.16 },
          { tick: 56, opacity: 0.62 },
          { tick: 84, opacity: 0.34 },
          { tick: 104, opacity: 0.84 },
          { tick: 136, opacity: 1 }
        ]
      },
      sourceSize: { width: 3840, height: 2160 },
      sourceFrameCount: 500,
      webTargetSize: { width: 295, height: 295 },
      webFrameCount: 60,
      webTargetRule: "Duplicate web frames are evenly sampled from the full fuzz sequence and resized to the WBP black-and-white static overlay slot."
    },
    blackAndWhiteCartonSpin: {
      folder: "WebPlayerOptimized/Visualizers/blackandwhite mode/carton spin",
      sourceFolder: "Visualizers/blackandwhite mode/carton spin",
      firstFrame: "milk spin iso0000.webp",
      framePrefix: "milk spin iso",
      frameExtension: "webp",
      frameStart: 0,
      frameEnd: 299,
      frameDigits: 4,
      framesPerSecond: 30,
      playback: "loopWhenPlayingHoldWhenPaused",
      layout: "blackAndWhiteImage",
      backing: "blackAndWhiteBackground",
      motionEase: { inMs: 900, outMs: 900 },
      crossfadeMs: 600,
      sourceSize: { width: 1080, height: 1080 },
      sourceFrameCount: 300,
      webTargetSize: { width: 295, height: 295 },
      webDisplaySize: { width: 280, height: 280 },
      webTargetRule: "Duplicate web frames are resized to the WBP black-and-white visualizer image slot."
    }
    },
    visualizerRosters: {
      default: ["defaultSlimeBeach", "defaultPBJSlime", "defaultSlimeSpread", "defaultCDSpin"],
      blackAndWhite: ["blackAndWhiteCartonSpin"],
      blackAndWhitePaused: ["blackAndWhiteStatic"]
    }
  }
};
