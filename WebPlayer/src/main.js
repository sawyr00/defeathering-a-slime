const app = document.querySelector("#app");
const playerConfig = window.SlimeBallPlayerConfig;
const mobileAssetConfig = playerConfig.mobileAssets || null;
const useMobileAssets = Boolean(
  mobileAssetConfig && window.matchMedia(mobileAssetConfig.mediaQuery).matches
);
const audioMix = {
  master: 0.72,
  music: 0.66,
  effects: 0.62,
  backgroundNoise: 0.5,
  ambientLoops: 0.44
};
const playerState = {
  activeSkinMode: "default",
  currentSide: "front",
  currentTrackIndex: 0,
  currentVisualizerIndex: 0,
  hasEverPlayed: false,
  hatchOpen: false,
  isPlaying: false,
  isAnimationLocked: false,
  isRotating: false,
  trackslimesExtended: false,
  bbNetworkRingPlaying: false,
  hatchResumeOnFront: false,
  bootAudioStarted: false
};
const runtime = {
  stage: null,
  shell: null,
  layers: {},
  hitMasks: [],
  hitHandlers: {},
  currentTrackAudio: null,
  analysisEnvelope: null,
  analysisEnvelopeKey: "",
  analysisBuffer: null,
  analysisBufferUrl: "",
  analysisBufferSource: null,
  analysisLoadToken: 0,
  bootAudio: null,
  bootAudioPending: false,
  backgroundNoiseAudio: null,
  blackAndWhiteStaticAudio: null,
  beaconSoundAudio: null,
  beaconBackgroundAudio: null,
  bbNetworkRingLoopTimer: null,
  bbNetworkRingLoopFrameIndex: 0,
  visualizerLoopFrame: null,
  visualizerFrameIndex: 0,
  visualizerActiveKey: null,
  visualizerLastFrameTime: 0,
  visualizerFrameAccumulator: 0,
  visualizerSpeedFactor: 0,
  visualizerTargetSpeedFactor: 0,
  visualizerEaseStartTime: 0,
  visualizerEaseStartFactor: 0,
  visualizerEaseDuration: 0,
  visualizerFrameImagesByKey: new Map(),
  visualizerPreloadPromises: new Map(),
  visualizerCrossfadeTimer: null,
  pbjAnimationFrame: null,
  pbjLastFrameTime: 0,
  pbjRunningTime: 0,
  pbjMotionPhase: 0,
  pbjSmoothedAudioLevel: 0,
  pbjRawAudioLevel: 0,
  pbjWebGL: null,
  audioContext: null,
  audioAnalyser: null,
  audioAnalysisSilenceGain: null,
  audioFrequencyData: null,
  blackAndWhiteStaticOverlayFrameIndex: 0,
  blackAndWhiteStaticOverlayFrameAccumulator: 0,
  blackAndWhiteStaticOverlayLastFrameTime: 0,
  blackAndWhiteStaticOverlayLoopFrame: null,
  blackAndWhiteDisplayedIsPlaying: false,
  blackAndWhitePendingIsPlaying: false,
  blackAndWhiteIsTransitioning: false,
  blackAndWhiteTransitionStartTime: 0,
  blackAndWhiteTransitionTickCounter: 0,
  blackAndWhiteTransitionFrame: null,
  imageCache: new Map(),
  sequencePreloadPromises: new Map(),
  npHoverTimer: null,
  npAnimationTimers: new Set(),
  npTransition: null,
  npAnimationToken: 0,
  npHoverTime: 0,
  npVisible: false,
  nowPlayingScrollFrame: null,
  nowPlayingScrollToken: 0,
  nowPlayingScrollTitle: "",
  startupAudioRetryBound: false,
  inputPending: false
};

function resolvedAssetPath(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  if (!useMobileAssets || !/\.(png|jpg|jpeg)$/i.test(normalized)) return normalized;

  const isIncluded = mobileAssetConfig.sourcePrefixes.some((prefix) => normalized.startsWith(prefix));
  const isExcluded = mobileAssetConfig.sourceExclusions.some((prefix) => normalized.startsWith(prefix));
  if (!isIncluded || isExcluded) return normalized;

  const webpPath = normalized.replace(/\.(png|jpg|jpeg)$/i, ".webp");
  return `${mobileAssetConfig.root}/${webpPath}`;
}

function assetUrl(relativePath) {
  const resolvedPath = resolvedAssetPath(relativePath);
  const url = encodeURI(`${playerConfig.assetRoot}/${resolvedPath}`.replaceAll("\\", "/"));
  if (!playerConfig.assetVersion || !/\.(png|jpg|jpeg|webp)$/i.test(resolvedPath)) return url;
  return `${url}?v=${encodeURIComponent(playerConfig.assetVersion)}`;
}

function createLayer(name, options) {
  const element = document.createElement(options.tag || "img");
  element.className = `player-layer ${name}`;
  element.dataset.layer = name;

  if (options.tag === "canvas") {
    element.width = options.width;
    element.height = options.height;
  }

  if (options.src) {
    element.src = assetUrl(options.src);
    element.alt = "";
    element.draggable = false;
  }

  Object.assign(element.style, {
    left: `${options.x}px`,
    top: `${options.y}px`,
    width: `${options.width}px`,
    height: `${options.height}px`,
    zIndex: String(options.zIndex || 0)
  });

  return element;
}

function createAssemblyLayer(name, source, zIndex) {
  const assembly = playerConfig.playerAssembly;
  return createLayer(name, {
    src: source,
    x: assembly.x,
    y: assembly.y,
    width: assembly.width,
    height: assembly.height,
    zIndex
  });
}

function createAssemblyCanvasLayer(name, zIndex) {
  const assembly = playerConfig.playerAssembly;
  return createLayer(name, {
    tag: "canvas",
    x: assembly.x,
    y: assembly.y,
    width: assembly.width,
    height: assembly.height,
    zIndex
  });
}

function frames(folder, frameNames) {
  return frameNames.map((frameName) => `${folder}/${frameName}`);
}

function frameRange(firstFrame, lastFrame) {
  const first = frameNumber(firstFrame);
  const last = frameNumber(lastFrame);
  const extension = firstFrame.split(".").pop();
  const width = firstFrame.replace(/\.[^.]+$/, "").length;
  const direction = first <= last ? 1 : -1;
  const names = [];

  for (let frame = first; direction > 0 ? frame <= last : frame >= last; frame += direction) {
    names.push(`${String(frame).padStart(width, "0")}.${extension}`);
  }

  return names;
}

function frameNumber(frameName) {
  return Number(frameName.replace(/\.[^.]+$/, ""));
}

function sequenceFramePaths(sequence, options = {}) {
  return frames(sequence.folder, options.reverse ? [...sequence.frames].reverse() : sequence.frames);
}

function visualizerFrameCount(visualizer) {
  if (isLivePBJVisualizer(visualizer)) return 1;
  if (Number.isInteger(visualizer.frameStart) && Number.isInteger(visualizer.frameEnd)) {
    return Math.abs(visualizer.frameEnd - visualizer.frameStart) + 1;
  }

  return 1;
}

function visualizerFrameName(visualizer, frameIndex = 0) {
  if (visualizer.framePrefix == null) return visualizer.firstFrame;

  const frameCount = visualizerFrameCount(visualizer);
  const normalizedIndex = ((frameIndex % frameCount) + frameCount) % frameCount;
  const frameNumber = visualizer.frameStart + normalizedIndex;
  return `${visualizer.framePrefix}${String(frameNumber).padStart(visualizer.frameDigits || 4, "0")}.${visualizer.frameExtension || "png"}`;
}

function visualizerFramePath(visualizer, frameIndex = 0) {
  if (isLivePBJVisualizer(visualizer)) return "";
  return `${visualizer.folder}/${visualizerFrameName(visualizer, frameIndex)}`;
}

function visualizerFramePaths(visualizer) {
  const frameCount = visualizerFrameCount(visualizer);
  return Array.from({ length: frameCount }, (_, frameIndex) => visualizerFramePath(visualizer, frameIndex));
}

function preloadImage(relativePath) {
  const url = assetUrl(relativePath);
  if (runtime.imageCache.has(url)) return runtime.imageCache.get(url);

  const promise = new Promise((resolve) => {
    const image = new Image();
    image.onload = async () => {
      if (image.decode) {
        try {
          await image.decode();
        } catch {}
      }
      resolve(image);
    };
    image.onerror = () => {
      console.warn(`Could not preload image: ${relativePath}`);
      resolve(image);
    };
    image.decoding = "async";
    image.src = url;
  });

  runtime.imageCache.set(url, promise);
  return promise;
}

async function waitForImageElement(image) {
  if (!(image instanceof HTMLImageElement) || !image.src) return;

  if (!image.complete) {
    await new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  }

  if (!image.naturalWidth || !image.decode) return;
  try {
    await image.decode();
  } catch {}
}

async function revealInitialComposition() {
  const initialVisibleLayers = [
    runtime.layers.frontSkin,
    runtime.layers.hatchStatic,
    runtime.layers.sharedButtonStatic,
    runtime.layers.playPauseStatic
  ];

  await Promise.all(initialVisibleLayers.map(waitForImageElement));
  await nextAnimationFrame();
  runtime.layers.startupFade.classList.add("startup-fade-complete");
  initializeHitMasks();
  preloadFrontSideSequences();
}

function drawFrame(layer, image) {
  if (layer instanceof HTMLCanvasElement) {
    const context = layer.getContext("2d");
    context.clearRect(0, 0, layer.width, layer.height);
    context.drawImage(image, 0, 0, layer.width, layer.height);
    return;
  }

  layer.src = image.src;
}

function drawCrossfadeFrame(layer, fromImage, toImage, progress) {
  if (!(layer instanceof HTMLCanvasElement)) return;
  const context = layer.getContext("2d");
  context.clearRect(0, 0, layer.width, layer.height);
  context.globalAlpha = 1;
  context.drawImage(fromImage, 0, 0, layer.width, layer.height);
  context.globalAlpha = progress;
  context.drawImage(toImage, 0, 0, layer.width, layer.height);
  context.globalAlpha = 1;
}

function clearCanvas(layer) {
  if (layer instanceof HTMLCanvasElement) {
    layer.getContext("2d").clearRect(0, 0, layer.width, layer.height);
  }
}

function nextAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function preloadSequence(sequence) {
  const key = `${sequence.folder}|${sequence.frames.join(",")}`;
  if (runtime.sequencePreloadPromises.has(key)) return runtime.sequencePreloadPromises.get(key);

  const promise = preloadImagesInBatches(sequenceFramePaths(sequence), 8);
  runtime.sequencePreloadPromises.set(key, promise);
  return promise;
}

async function preloadImagesInBatches(paths, batchSize) {
  const images = [];
  for (let index = 0; index < paths.length; index += batchSize) {
    const batch = paths.slice(index, index + batchSize);
    images.push(...await Promise.all(batch.map(preloadImage)));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return images;
}

async function preloadImagesInBatchesWithProgress(paths, batchSize, onImageLoaded) {
  for (let index = 0; index < paths.length; index += batchSize) {
    const batch = paths.slice(index, index + batchSize);
    const images = await Promise.all(batch.map(preloadImage));
    images.forEach((image, offset) => onImageLoaded(index + offset, image));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

function preloadFeatureSequence(feature) {
  return preloadSequence(featureSequence(feature));
}

function preloadFrontSideSequences() {
  const criticalSequences = [
    playerConfig.sequences.buttons.previous,
    playerConfig.sequences.buttons.bbButton,
    playerConfig.sequences.buttons.next,
    playerConfig.sequences.buttons.playPause,
    playerConfig.sequences.hatch.normal,
    playerConfig.sequences.hatch.blackAndWhite
  ];
  const featureSequences = [
    featureSequence(playerConfig.sequences.features.trackslimes),
    featureSequence(playerConfig.sequences.features.skeletonArm),
    skeletonArmSequence("blackAndWhite"),
    {
      folder: playerConfig.sequences.features.bbNetworkRing.folder,
      frames: frameRange(
        playerConfig.sequences.features.bbNetworkRing.loopStartFrame,
        playerConfig.sequences.features.bbNetworkRing.loopEndFrame
      )
    },
    {
      folder: playerConfig.sequences.features.bbNetworkRing.blackAndWhiteFolder,
      frames: frameRange(
        playerConfig.sequences.features.bbNetworkRing.loopStartFrame,
        playerConfig.sequences.features.bbNetworkRing.loopEndFrame
      )
    }
  ];
  const rotationSequences = [
    ...Object.values(playerConfig.rotationTransitions).map((transition) => rotationSequence(transition, "default")),
    ...Object.values(playerConfig.rotationTransitions).map((transition) => rotationSequence(transition, "blackAndWhite"))
  ];

  const criticalPreloads = criticalSequences.map((sequence) => preloadSequence(sequence));
  preloadVisualizerDecorationAssets();
  if (useMobileAssets) {
    Promise.all(criticalPreloads).then(() => warmMobileFirstActions());
    return;
  }

  featureSequences
    .filter((sequence) => sequence.folder === playerConfig.sequences.features.bbNetworkRing.folder
      || sequence.folder === playerConfig.sequences.features.bbNetworkRing.blackAndWhiteFolder)
    .forEach((sequence) => preloadSequence(sequence));
  window.setTimeout(() => {
    [...featureSequences, ...rotationSequences].forEach((sequence) => preloadSequence(sequence));
    preloadVisualizerFrames(currentVisualizerKey());
    preloadVisualizerFrames("blackAndWhiteStatic");
    preloadVisualizerFrames("blackAndWhiteCartonSpin");
  }, 250);
}

async function warmMobileFirstActions() {
  const firstActions = [
    featureSequence(playerConfig.sequences.features.trackslimes),
    ...playerConfig.rotationControls
      .filter((control) => control.from === "front")
      .map((control) => rotationSequence(playerConfig.rotationTransitions[control.transition], "default"))
  ];

  await Promise.all(firstActions.map((sequence) => preloadSequence(sequence)));
}

function preloadVisualizerDecorationAssets() {
  const visualizers = Object.values(playerConfig.sequences.visualizers);
  const decorationPaths = new Set();
  visualizers.forEach((visualizer) => {
    [visualizer.backing, visualizer.overlay].forEach((widgetName) => {
      const source = widgetName && playerConfig.visualizerMaskPanel[widgetName]?.src;
      if (source) decorationPaths.add(source);
    });
  });
  decorationPaths.forEach((source) => preloadImage(source));
}

function buildPlayerShell() {
  const shell = document.createElement("section");
  shell.className = "slimeball-shell";
  shell.dataset.assetMode = useMobileAssets ? "mobile" : "desktop";

  const stage = document.createElement("section");
  stage.className = "slimeball-stage";
  stage.style.setProperty("--stage-width", playerConfig.stage.width);
  stage.style.setProperty("--stage-height", playerConfig.stage.height);
  stage.style.width = `${playerConfig.stage.width}px`;
  stage.style.height = `${playerConfig.stage.height}px`;

  const mask = playerConfig.visualizerMaskPanel;
  const npRoot = playerConfig.npSkinRoot;

  runtime.shell = shell;
  runtime.stage = stage;

  runtime.layers.visualizerMask = createLayer("visualizer-mask", {
      tag: "div",
      x: mask.x,
      y: mask.y,
      width: mask.width,
      height: mask.height,
      zIndex: 21
    });
  runtime.layers.visualizerBackingImage = document.createElement("img");
  runtime.layers.visualizerBackingImage.className = "visualizer-backing-image";
  runtime.layers.visualizerBackingImage.alt = "";
  runtime.layers.visualizerBackingImage.draggable = false;
  runtime.layers.visualizerImage = document.createElement("img");
  runtime.layers.visualizerImage.className = "visualizer-image";
  runtime.layers.visualizerImage.alt = "";
  runtime.layers.visualizerImage.draggable = false;
  runtime.layers.visualizerImage.src = assetUrl(currentVisualizerSource());
  runtime.layers.visualizerCrossfadeImage = document.createElement("img");
  runtime.layers.visualizerCrossfadeImage.className = "visualizer-crossfade-image";
  runtime.layers.visualizerCrossfadeImage.alt = "";
  runtime.layers.visualizerCrossfadeImage.draggable = false;
  runtime.layers.pbjVisualizer = document.createElement("canvas");
  runtime.layers.pbjVisualizer.className = "visualizer-pbj-canvas";
  runtime.layers.pbjVisualizer.width = playerConfig.visualizerMaskPanel.pbjImage.width;
  runtime.layers.pbjVisualizer.height = playerConfig.visualizerMaskPanel.pbjImage.height;
  applyVisualizerLayout();
  runtime.layers.visualizerMask.append(
    runtime.layers.visualizerBackingImage,
    runtime.layers.pbjVisualizer,
    runtime.layers.visualizerImage,
    runtime.layers.visualizerCrossfadeImage
  );
  runtime.layers.visualizerOverlay = createLayer("visualizer-overlay", {
    tag: "img",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    zIndex: 28
  });
  runtime.layers.visualizerOverlay.alt = "";
  runtime.layers.visualizerOverlay.draggable = false;

  runtime.layers.frontSkin = createAssemblyLayer("front-skin", playerConfig.layers.frontSkin, 20);
  runtime.layers.sideStatic = createAssemblyLayer("side-static", playerConfig.layers.sides.left.default, 20);
  runtime.layers.hatchWindow = createAssemblyLayer("hatch-window", playerConfig.layers.hatchWindow, 29);
  runtime.layers.hatchStatic = createAssemblyLayer("hatch-static", playerConfig.layers.hatchClosed, 30);
  runtime.layers.hatchAnimation = createAssemblyCanvasLayer("hatch-animation", 31);
  runtime.layers.sharedButtonStatic = createAssemblyLayer("shared-button-static", playerConfig.layers.frontAudioButtons, 40);
  runtime.layers.sharedButtonAnimation = createAssemblyCanvasLayer("shared-button-animation", 41);
  runtime.layers.playPauseStatic = createAssemblyLayer("play-pause-static", playerConfig.layers.playPauseUnpressed, 42);
  runtime.layers.playPauseAnimation = createAssemblyCanvasLayer("play-pause-animation", 43);
  runtime.layers.trackslimes = createAssemblyLayer("trackslimes", playerConfig.layers.trackslimesResting, 18);
  runtime.layers.trackslimesAnimation = createAssemblyCanvasLayer("trackslimes-animation", 19);
  runtime.layers.bbNetworkRingAnimation = createAssemblyCanvasLayer("bb-network-ring-animation", 60);
  runtime.layers.skeletonArmAnimation = createAssemblyCanvasLayer("skeleton-arm-animation", 70);
  runtime.layers.rotationAnimation = createAssemblyCanvasLayer("rotation-animation", 80);
  runtime.layers.npSkinRoot = createLayer("np-skin-root", {
    tag: "div",
    x: npRoot.x,
    y: npRoot.y,
    width: npRoot.width,
    height: npRoot.height,
    zIndex: 15
  });
  runtime.layers.npTrackTextMask = document.createElement("div");
  runtime.layers.npTrackTextMask.className = "np-track-text-mask";
  Object.assign(runtime.layers.npTrackTextMask.style, {
    left: `${npRoot.trackText.mask.x}px`,
    top: `${npRoot.trackText.mask.y}px`,
    width: `${npRoot.trackText.mask.width}px`,
    height: `${npRoot.trackText.mask.height}px`
  });
  runtime.layers.npTrackTextBackground = document.createElement("div");
  runtime.layers.npTrackTextBackground.className = "np-track-text-background";
  runtime.layers.nowPlayingGlow = document.createElement("div");
  runtime.layers.nowPlayingGlow.className = "now-playing-text now-playing-text-glow";
  runtime.layers.nowPlayingText = document.createElement("div");
  runtime.layers.nowPlayingText.className = "now-playing-text";
  runtime.layers.npTrackWindow = document.createElement("img");
  runtime.layers.npTrackWindow.className = "np-track-window";
  runtime.layers.npTrackWindow.alt = "";
  runtime.layers.npTrackWindow.draggable = false;
  runtime.layers.npTrackWindow.src = assetUrl(npRoot.trackText.window.src);
  applyNPTrackWindowLayout();
  initializeNowPlayingTextLayer(runtime.layers.nowPlayingGlow);
  initializeNowPlayingTextLayer(runtime.layers.nowPlayingText);
  runtime.layers.npTrackTextMask.append(
    runtime.layers.npTrackTextBackground,
    runtime.layers.nowPlayingGlow,
    runtime.layers.nowPlayingText,
    runtime.layers.npTrackWindow
  );
  runtime.layers.npSkinRoot.append(runtime.layers.npTrackTextMask);
  runtime.layers.npSkinImage = document.createElement("img");
  runtime.layers.npSkinImage.className = "np-skin-image";
  runtime.layers.npSkinImage.alt = "";
  runtime.layers.npSkinImage.draggable = false;
  Object.assign(runtime.layers.npSkinImage.style, {
    left: `${npRoot.skinImage.x}px`,
    top: `${npRoot.skinImage.y}px`,
    width: `${npRoot.skinImage.width}px`,
    height: `${npRoot.skinImage.height}px`
  });
  runtime.layers.npSkinRoot.append(runtime.layers.npSkinImage);
  updateNowPlayingText();

  runtime.layers.startupFade = createLayer("startup-fade", {
    tag: "div",
    x: 0,
    y: 0,
    width: playerConfig.stage.width,
    height: playerConfig.stage.height,
    zIndex: 100
  });

  runtime.layers.hitSurface = createLayer("hit-surface", {
    tag: "button",
    x: playerConfig.playerAssembly.x,
    y: playerConfig.playerAssembly.y,
    width: playerConfig.playerAssembly.width,
    height: playerConfig.playerAssembly.height,
    zIndex: 90
  });
  runtime.layers.hitSurface.type = "button";
  runtime.layers.hitSurface.setAttribute("aria-label", "SlimeBallSummer player controls");

  stage.append(
    runtime.layers.visualizerMask,
    runtime.layers.visualizerOverlay,
    runtime.layers.trackslimes,
    runtime.layers.frontSkin,
    runtime.layers.sideStatic,
    runtime.layers.hatchWindow,
    runtime.layers.hatchStatic,
    runtime.layers.hatchAnimation,
    runtime.layers.sharedButtonStatic,
    runtime.layers.sharedButtonAnimation,
    runtime.layers.playPauseStatic,
    runtime.layers.playPauseAnimation,
    runtime.layers.trackslimesAnimation,
    runtime.layers.bbNetworkRingAnimation,
    runtime.layers.skeletonArmAnimation,
    runtime.layers.rotationAnimation,
    runtime.layers.npSkinRoot,
    runtime.layers.startupFade,
    runtime.layers.hitSurface
  );

  shell.append(stage);
  app.replaceChildren(shell);
  syncStageScale(shell, stage);
  runtime.layers.hitSurface.addEventListener("click", handlePlayerClick);
  renderState();
  revealInitialComposition();
  bindStartupAudioRetry();
  requestStartupAudio();
}

function syncStageScale(shell, stage) {
  const resize = () => {
    if (useMobileAssets) {
      const mobileLayout = mobileAssetConfig.layout || {};
      const sideInset = mobileLayout.sideInset ?? 10;
      const topInset = mobileLayout.topInset ?? 10;
      const npRoot = playerConfig.npSkinRoot;
      const highestVisibleY = npRoot.y + npRoot.movement.peak.y + npRoot.skinImage.y;
      const lowestVisibleY = playerConfig.playerAssembly.y + playerConfig.playerAssembly.height;
      const visibleHeight = lowestVisibleY - highestVisibleY;
      const widthScale = Math.max(0, shell.clientWidth - sideInset * 2)
        / playerConfig.playerAssembly.width;
      const heightScale = Math.max(0, shell.clientHeight - topInset * 2) / visibleHeight;
      const scale = Math.min(widthScale, heightScale);
      const stageWidth = playerConfig.stage.width * scale;
      const offsetX = (shell.clientWidth - stageWidth) / 2;
      const offsetY = topInset - highestVisibleY * scale;
      stage.style.setProperty("--stage-scale", String(scale));
      stage.style.setProperty("--stage-offset-x", `${offsetX}px`);
      stage.style.setProperty("--stage-offset-y", `${offsetY}px`);
      return;
    }

    const widthScale = shell.clientWidth / playerConfig.stage.width;
    const heightScale = shell.clientHeight / playerConfig.stage.height;
    stage.style.setProperty("--stage-scale", String(Math.min(widthScale, heightScale)));
    stage.style.setProperty("--stage-offset-x", "0px");
    stage.style.setProperty("--stage-offset-y", "0px");
  };

  resize();
  new ResizeObserver(resize).observe(shell);
}

async function initializeHitMasks() {
  const frontMasks = [
    ["playPause", onPlayPauseButton, { sides: ["front"] }],
    ["previous", onPreviousButton, { sides: ["front"] }],
    ["next", onNextButton, { sides: ["front"] }],
    ["bbButton", onBBButton, { sides: ["front"] }],
    ["signButton", onSignButton, { sides: ["front"] }],
    ["bbNetworkRingButton", onBBNetworkRingButton, { sides: ["front"] }],
    ["skeletonArmButton", onSkeletonArmButton, { sides: ["back"], fallbackOnly: true }],
    ["cdButton", onNotYetWiredButton, { sides: ["front"] }],
    ["tapeButton", onNotYetWiredButton, { sides: ["front"] }],
    ["umbrellaButton", onNotYetWiredButton, { sides: ["front"] }]
  ];
  const rotationMasks = playerConfig.rotationControls.map((control) => [
    control.id,
    () => onRotationControl(control.id),
    control
  ]);
  const orderedMasks = [...frontMasks, ...rotationMasks];

  runtime.hitHandlers = Object.fromEntries(orderedMasks.map(([name, handler]) => [name, handler]));
  runtime.hitMasks = (await Promise.all(
    orderedMasks.map(async ([name, handler, metadata]) => {
      if (metadata && metadata.fallbackOnly) return null;
      const isRotationControl = Boolean(metadata && metadata.mask);
      const mask = await loadMask(isRotationControl ? metadata.mask : playerConfig.hitMasks[name]);
      return mask ? {
        name,
        handler,
        mask,
        control: isRotationControl ? metadata : null,
        sides: isRotationControl ? [metadata.from] : metadata.sides
      } : null;
    })
  )).filter(Boolean);
}

function loadMask(source) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      resolve({ canvas, context, width: canvas.width, height: canvas.height });
    };
    image.onerror = () => {
      console.warn(`Could not load hit mask: ${source}`);
      resolve(null);
    };
    image.src = assetUrl(source);
  });
}

function handlePlayerClick(event) {
  if (playerState.isRotating || runtime.inputPending) return;
  requestStartupAudio();
  const point = playerAssemblyPointFromEvent(event);
  const buttonHit = runtime.hitMasks.find((hitMask) => !hitMask.control && hitMaskAtPoint(hitMask, point));
  const buttonFallbackHitName = buttonHit ? null : fallbackButtonHitNameAtPoint(point);
  const buttonHandler = buttonHit ? buttonHit.handler : runtime.hitHandlers[buttonFallbackHitName];

  if (buttonHandler) {
    dispatchPlayerAction(buttonHandler);
    return;
  }

  const rotationHit = runtime.hitMasks.find((hitMask) => hitMask.control && hitMaskAtPoint(hitMask, point));
  const rotationFallbackHitName = rotationHit ? null : fallbackRotationHitNameAtPoint(point);
  const rotationHandler = rotationHit ? rotationHit.handler : runtime.hitHandlers[rotationFallbackHitName];
  if (rotationHandler) dispatchPlayerAction(rotationHandler);
}

function dispatchPlayerAction(handler) {
  runtime.inputPending = true;
  let result;
  try {
    result = handler();
  } catch (error) {
    runtime.inputPending = false;
    throw error;
  }

  if (!result || typeof result.then !== "function") {
    runtime.inputPending = false;
    return;
  }

  result
    .catch((error) => console.error("Player action failed.", error))
    .finally(() => {
      runtime.inputPending = false;
    });
}

function hitMaskAtPoint(hitMask, point) {
  const { mask, control, sides } = hitMask;
  if (!control && !sides.includes(playerState.currentSide)) return false;
  if (control && control.from !== playerState.currentSide) return false;
  const x = Math.floor(point.x * (mask.width / playerConfig.playerAssembly.width));
  const y = Math.floor(point.y * (mask.height / playerConfig.playerAssembly.height));
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false;
  try {
    return mask.context.getImageData(x, y, 1, 1).data[3] > 12;
  } catch (error) {
    console.warn("Hit-mask pixel read failed; using rectangular fallback hit areas.", error);
    runtime.hitMasks = [];
    return false;
  }
}

function fallbackButtonHitNameAtPoint(point) {
  const buttonFallbacks = [
    ["playPause", "front"],
    ["previous", "front"],
    ["next", "front"],
    ["bbButton", "front"],
    ["signButton", "front"],
    ["bbNetworkRingButton", "front"],
    ["skeletonArmButton", "back"],
    ["cdButton", "front"],
    ["tapeButton", "front"],
    ["umbrellaButton", "front"]
  ];
  const buttonHit = buttonFallbacks.find(([name, side]) => (
    side === playerState.currentSide && pointInHitArea(point, playerConfig.hitAreas[name])
  ));
  if (buttonHit) return buttonHit[0];

  return null;
}

function fallbackRotationHitNameAtPoint(point) {
  const rotationHit = playerConfig.rotationControls.find((control) => (
    control.from === playerState.currentSide && pointInHitArea(point, control.hitArea)
  ));
  return rotationHit ? rotationHit.id : null;
}

function pointInHitArea(point, area) {
  if (!area) return false;
  const centerX = area.x + area.width / 2;
  const centerY = area.y + area.height / 2;
  const radians = -(area.angle || 0) * Math.PI / 180;
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  const localX = dx * Math.cos(radians) - dy * Math.sin(radians) + area.width / 2;
  const localY = dx * Math.sin(radians) + dy * Math.cos(radians) + area.height / 2;
  return localX >= 0 && localY >= 0 && localX <= area.width && localY <= area.height;
}

function playerAssemblyPointFromEvent(event) {
  const rect = runtime.stage.getBoundingClientRect();
  const scale = rect.width / playerConfig.stage.width;
  const stageX = (event.clientX - rect.left) / scale;
  const stageY = (event.clientY - rect.top) / scale;
  return {
    x: stageX - playerConfig.playerAssembly.x,
    y: stageY - playerConfig.playerAssembly.y
  };
}

function unlockAudio() {
  requestStartupAudio();
}

function bindStartupAudioRetry() {
  if (runtime.startupAudioRetryBound) return;
  runtime.startupAudioRetryBound = true;

  const retryStartupAudio = () => requestStartupAudio();
  document.addEventListener("pointerdown", retryStartupAudio, { capture: true });
  document.addEventListener("keydown", retryStartupAudio, { capture: true });
  document.addEventListener("touchstart", retryStartupAudio, { capture: true, passive: true });
}

function requestStartupAudio() {
  startBackgroundNoise();
  startBootAudio();
}

function startBootAudio() {
  const hasUserActivation = Boolean(navigator.userActivation && navigator.userActivation.isActive);
  if (playerState.bootAudioStarted || (runtime.bootAudioPending && !hasUserActivation)) return;
  if (!runtime.bootAudio) runtime.bootAudio = createAudio(playerConfig.audio.boot, audioMix.effects);

  try {
    runtime.bootAudio.currentTime = 0;
  } catch {}

  runtime.bootAudioPending = true;
  let playPromise = null;
  try {
    playPromise = runtime.bootAudio.play();
  } catch {
    runtime.bootAudioPending = false;
    return;
  }
  if (playPromise && typeof playPromise.then === "function") {
    playPromise
      .then(() => {
        runtime.bootAudioPending = false;
        playerState.bootAudioStarted = true;
      })
      .catch(() => {
        runtime.bootAudioPending = false;
      });
    return;
  }

  runtime.bootAudioPending = false;
  playerState.bootAudioStarted = true;
}

function startBackgroundNoise() {
  if (!runtime.backgroundNoiseAudio) {
    runtime.backgroundNoiseAudio = loopAudio(playerConfig.audio.backgroundNoise, audioMix.backgroundNoise, {
      overlapSeconds: 0.12
    });
    return;
  }

  resumeAudio(runtime.backgroundNoiseAudio);
}

async function onPlayPauseButton() {
  if (playerState.isAnimationLocked) return;
  playOneShot(playerConfig.audio.playPauseButton);
  const nextPlayingState = !playerState.isPlaying;
  let completed = false;
  try {
    await animateImageSequence(runtime.layers.playPauseAnimation, playerConfig.sequences.buttons.playPause, {
      reverse: playerState.isPlaying,
      onReady: () => runtime.layers.playPauseStatic.classList.add("hidden"),
      onBeforeFinish: () => {
        playerState.isPlaying = nextPlayingState;
        playerState.hasEverPlayed = true;
        renderState();
        runtime.layers.playPauseStatic.classList.remove("hidden");
        completed = true;
      }
    });
  } finally {
    if (!completed) runtime.layers.playPauseStatic.classList.remove("hidden");
  }
  if (playerState.isPlaying) playCurrentTrack();
  else pauseCurrentTrack();
  if (nextPlayingState && !playerState.hatchOpen) {
    playerState.hatchResumeOnFront = true;
    playOneShot(playerConfig.audio.hatchOpenOnly);
    await playHatch(true);
  }
  renderState();
}

async function onNextButton() {
  if (playerState.isAnimationLocked) return;
  playOneShot(playerConfig.audio.nextPreviousButton);
  await animateSharedButton(playerConfig.sequences.buttons.next);
  if (!playerState.isPlaying) return;
  stopCurrentTrack();
  playerState.currentTrackIndex = (playerState.currentTrackIndex + 1) % playlist().length;
  playCurrentTrack();
  renderState();
}

async function onPreviousButton() {
  if (playerState.isAnimationLocked) return;
  playOneShot(playerConfig.audio.nextPreviousButton);
  await animateSharedButton(playerConfig.sequences.buttons.previous);
  if (!playerState.isPlaying) return;
  const currentTime = runtime.currentTrackAudio ? runtime.currentTrackAudio.currentTime : 0;
  stopCurrentTrack();
  if (currentTime <= 2) {
    playerState.currentTrackIndex = (playerState.currentTrackIndex - 1 + playlist().length) % playlist().length;
  }
  playCurrentTrack();
  renderState();
}

async function onBBButton() {
  if (playerState.isAnimationLocked) return;
  playOneShot(playerConfig.audio.bbButton);
  await animateSharedButton(playerConfig.sequences.buttons.bbButton);

  if (playerState.hatchOpen) {
    playOneShot(playerConfig.audio.hatchCloseOpen);
    await playHatch(false);
    nextVisualizer();
    await playHatch(true);
  } else {
    playerState.hatchResumeOnFront = true;
    playOneShot(playerConfig.audio.hatchOpenOnly);
    await playHatch(true);
  }
}

async function onSignButton() {
  if (playerState.isAnimationLocked) return;
  if (playerState.bbNetworkRingPlaying) await retractBBNetworkRing();
  if (playerState.trackslimesExtended) await retractTrackslimes();
  else await extendTrackslimes();
}

async function onBBNetworkRingButton() {
  if (playerState.isAnimationLocked) return;
  if (playerState.bbNetworkRingPlaying) {
    await retractBBNetworkRing();
    return;
  }

  if (playerState.trackslimesExtended) await retractTrackslimes();
  await extendBBNetworkRing();
}

async function onSkeletonArmButton() {
  if (playerState.isAnimationLocked) return;
  const fromMode = playerState.activeSkinMode;
  const toMode = fromMode === "default" ? "blackAndWhite" : "default";
  const fromSequence = skeletonArmSequence(fromMode);
  const toSequence = skeletonArmSequence(toMode);
  playOneShot(playerConfig.audio.skinModeChange);
  let completed = false;
  try {
    await animateCrossfadeImageSequence(runtime.layers.skeletonArmAnimation, fromSequence, toSequence, {
      onReady: () => runtime.layers.sideStatic.classList.add("hidden"),
      keepLastFrame: true,
      keepVisible: true,
      keepLocked: true,
      framesPerSecond: playerConfig.frameRate.skeletonArmFramesPerSecond
    });
    stopCurrentTrack();
    playerState.isPlaying = false;
    playerState.activeSkinMode = toMode;
    playerState.currentTrackIndex = 0;
    playerState.currentVisualizerIndex = 0;
    playerState.hatchOpen = false;
    playerState.hatchResumeOnFront = false;
    renderState();

    await animateImageSequence(runtime.layers.skeletonArmAnimation, toSequence, {
      reverse: true,
      framesPerSecond: playerConfig.frameRate.skeletonArmFramesPerSecond,
      onBeforeFinish: () => {
        runtime.layers.sideStatic.classList.remove("hidden");
        completed = true;
      }
    });
  } finally {
    if (!completed) runtime.layers.sideStatic.classList.remove("hidden");
  }
}

function onRotationControl(controlId) {
  return rotateByControl(controlId);
}

function onNotYetWiredButton() {
  renderState();
}

async function animateSharedButton(sequence) {
  await animateImageSequence(runtime.layers.sharedButtonAnimation, sequence, {
    onReady: () => runtime.layers.sharedButtonStatic.classList.add("hidden")
  });
  runtime.layers.sharedButtonStatic.classList.remove("hidden");
}

async function playHatch(open) {
  const isBlackAndWhite = playerState.activeSkinMode === "blackAndWhite";
  const sequence = playerState.activeSkinMode === "blackAndWhite"
    ? playerConfig.sequences.hatch.blackAndWhite
    : playerConfig.sequences.hatch.normal;
  const playbackSequence = {
    folder: sequence.folder,
    frames: open ? sequence.frames.slice(1) : [...sequence.frames].reverse()
  };
  const framesPerSecond = isBlackAndWhite
    ? playerConfig.frameRate.blackAndWhiteSparseFramesPerSecond
    : playerConfig.frameRate.defaultFramesPerSecond;
  const hatchImages = await preloadSequence(playbackSequence);
  let completed = false;
  try {
    runtime.layers.hatchStatic.src = assetUrl(open
      ? (isBlackAndWhite ? playerConfig.layers.hatchOpenBlackAndWhite : playerConfig.layers.hatchOpen)
      : (isBlackAndWhite ? playerConfig.layers.hatchClosedBlackAndWhite : playerConfig.layers.hatchClosed));
    drawFrame(runtime.layers.hatchAnimation, hatchImages[0]);
    runtime.layers.hatchAnimation.classList.add("playing");
    runtime.stage.classList.add("hatch-animating");
    runtime.layers.hatchStatic.classList.add("hidden");
    runtime.layers.hatchStatic.style.display = "none";
    if (open) {
      playerState.hatchOpen = true;
      if (playerState.currentSide === "front") {
        runtime.layers.visualizerMask.classList.add("visible");
        runtime.layers.hatchWindow.classList.add("visible");
        syncVisualizerDecorationLayers();
        syncVisualizerPlayback();
        syncBlackAndWhiteStaticOverlay();
        syncBlackAndWhiteStaticAudio();
      }
    }
    await animateImageSequence(runtime.layers.hatchAnimation, playbackSequence, {
      framesPerSecond,
      preloadedImages: hatchImages,
      onBeforeFinish: () => {
        playerState.hatchOpen = open;
        renderState();
        runtime.layers.hatchStatic.classList.remove("hidden");
        completed = true;
      }
    });
  } finally {
    runtime.stage.classList.remove("hatch-animating");
    runtime.layers.hatchStatic.style.display = "";
    if (!completed) runtime.layers.hatchStatic.classList.remove("hidden");
  }
}

function nextVisualizer() {
  const roster = activeVisualizerRoster();
  stopVisualizerPlayback({ resetMotion: true });
  playerState.currentVisualizerIndex = (playerState.currentVisualizerIndex + 1) % roster.length;
  runtime.visualizerFrameIndex = 0;
  runtime.visualizerFrameAccumulator = 0;
  runtime.visualizerActiveKey = currentVisualizerKey();
  applyVisualizerLayout();
  syncVisualizerDecorationLayers();
  syncCurrentVisualizerFrame();
  syncVisualizerPlayback();
}

function activeVisualizerRoster() {
  return playerConfig.sequences.visualizerRosters[playerState.activeSkinMode];
}

function currentVisualizerSource() {
  const visualizer = currentVisualizer();
  if (isLivePBJVisualizer(visualizer)) return "";
  return visualizerFramePath(visualizer, runtime.visualizerFrameIndex);
}

function currentVisualizerKey() {
  const roster = activeVisualizerRoster();
  return roster[playerState.currentVisualizerIndex % roster.length];
}

function currentVisualizer() {
  return playerConfig.sequences.visualizers[currentVisualizerKey()];
}

function currentVisualizerLayout() {
  return layoutForVisualizer(currentVisualizer());
}

function layoutForVisualizer(visualizer) {
  const layouts = playerConfig.visualizerMaskPanel;
  if (visualizer?.layout && layouts[visualizer.layout]) {
    return layouts[visualizer.layout];
  }

  if (playerState.activeSkinMode === "blackAndWhite") {
    return layouts.blackAndWhiteImage;
  }

  return layouts.pbjImage;
}

function applyVisualizerLayout() {
  const layout = currentVisualizerLayout();
  const renderTranslation = layout.renderTranslation || { x: 0, y: 0 };
  Object.assign(runtime.layers.visualizerImage.style, {
    left: `${layout.x + renderTranslation.x}px`,
    top: `${layout.y + renderTranslation.y}px`,
    width: `${layout.width}px`,
    height: `${layout.height}px`
  });

  if (runtime.layers.pbjVisualizer) {
    Object.assign(runtime.layers.pbjVisualizer.style, {
      left: `${layout.x + renderTranslation.x}px`,
      top: `${layout.y + renderTranslation.y}px`,
      width: `${layout.width}px`,
      height: `${layout.height}px`
    });
  }
}

function applyImageWidgetLayout(layer, layout) {
  const renderTranslation = layout.renderTranslation || { x: 0, y: 0 };
  Object.assign(layer.style, {
    left: `${layout.x + renderTranslation.x}px`,
    top: `${layout.y + renderTranslation.y}px`,
    width: `${layout.width}px`,
    height: `${layout.height}px`,
    opacity: String(layout.opacity ?? 1)
  });

  if (layout.src) {
    const source = assetUrl(layout.src);
    if (layer.src !== source) layer.src = source;
  } else if (layer.tagName === "IMG" && layer.classList.contains("visualizer-backing-image")) {
    layer.removeAttribute("src");
  }

  layer.style.backgroundColor = layout.backgroundColor || "transparent";
}

function currentVisualizerImageWidget(kind) {
  const visualizer = currentVisualizer();
  const widgetName = visualizer?.[kind];
  if (!widgetName) return null;
  return playerConfig.visualizerMaskPanel[widgetName] || null;
}

function syncVisualizerDecorationLayers() {
  const visible = playerState.hatchOpen && playerState.currentSide === "front";
  const backing = currentVisualizerImageWidget("backing");
  const overlay = currentVisualizerImageWidget("overlay");

  if (backing) applyImageWidgetLayout(runtime.layers.visualizerBackingImage, backing);
  runtime.layers.visualizerBackingImage.classList.toggle("visible", Boolean(visible && backing));

  if (overlay) applyImageWidgetLayout(runtime.layers.visualizerOverlay, overlay);
  runtime.layers.visualizerOverlay.classList.toggle("visible", Boolean(visible && overlay));
}

function preloadVisualizerFrames(visualizerKey) {
  const visualizer = playerConfig.sequences.visualizers[visualizerKey];
  if (!visualizer) return Promise.resolve([]);
  if (isLivePBJVisualizer(visualizer)) return Promise.resolve([]);
  if (runtime.visualizerPreloadPromises.has(visualizerKey)) {
    return runtime.visualizerPreloadPromises.get(visualizerKey);
  }

  const imagePaths = visualizerFramePaths(visualizer);
  const images = [];
  runtime.visualizerFrameImagesByKey.set(visualizerKey, images);
  const promise = preloadImagesInBatchesWithProgress(imagePaths, 10, (frameIndex, image) => {
    images[frameIndex] = image;
  }).then(() => images);
  runtime.visualizerPreloadPromises.set(visualizerKey, promise);
  return promise;
}

function syncVisualizerPlayback() {
  const visualizerKey = currentVisualizerKey();
  const visualizer = currentVisualizer();
  const visible = playerState.hatchOpen && playerState.currentSide === "front";

  if (!visible || !visualizer) {
    stopVisualizerPlayback({ resetMotion: true });
    stopPBJVisualizer();
    runtime.visualizerActiveKey = null;
    syncBlackAndWhiteBaseVisualizerVisibility();
    return;
  }

  if (shouldHideBlackAndWhiteCartonBase()) {
    stopVisualizerPlayback({ resetMotion: true });
    stopPBJVisualizer();
    runtime.visualizerActiveKey = null;
    syncBlackAndWhiteBaseVisualizerVisibility();
    return;
  }

  syncBlackAndWhiteBaseVisualizerVisibility();

  if (runtime.visualizerActiveKey !== visualizerKey) {
    stopVisualizerPlayback({ resetMotion: true });
    stopPBJVisualizer();
    runtime.visualizerActiveKey = visualizerKey;
    runtime.visualizerFrameIndex = 0;
    runtime.visualizerFrameAccumulator = 0;
  }

  if (isLivePBJVisualizer(visualizer)) {
    runtime.layers.visualizerImage.style.visibility = "hidden";
    startPBJVisualizer(visualizer);
    return;
  }

  stopPBJVisualizer();
  preloadVisualizerFrames(visualizerKey);
  syncCurrentVisualizerFrame();

  if (visualizer.playback === "loopWhenPlayingHoldWhenPaused") {
    setVisualizerMotionTarget(playerState.isPlaying ? 1 : 0, visualizer);
    startVisualizerPlayback(visualizerKey);
    return;
  }

  if (visualizer.playback === "loopAlways") {
    setVisualizerMotionTarget(1, { motionEase: { durationMs: 0 } });
    startVisualizerPlayback(visualizerKey);
    return;
  }

  stopVisualizerPlayback({ resetMotion: true });
}

function startVisualizerCrossfade(previousKey, nextKey) {
  if (!previousKey || previousKey === nextKey) return;
  if (!isBlackAndWhiteVisualizerKey(previousKey) || !isBlackAndWhiteVisualizerKey(nextKey)) return;

  const fadeLayer = runtime.layers.visualizerCrossfadeImage;
  const previousSource = runtime.layers.visualizerImage.currentSrc || runtime.layers.visualizerImage.src;
  if (!fadeLayer || !previousSource) return;

  const previousVisualizer = playerConfig.sequences.visualizers[previousKey];
  const nextVisualizer = playerConfig.sequences.visualizers[nextKey];
  const previousLayout = layoutForVisualizer(previousVisualizer);
  const duration = nextVisualizer?.crossfadeMs ?? previousVisualizer?.crossfadeMs ?? 600;

  window.clearTimeout(runtime.visualizerCrossfadeTimer);
  applyImageWidgetLayout(fadeLayer, previousLayout);
  fadeLayer.src = previousSource;
  fadeLayer.style.transition = "none";
  fadeLayer.style.opacity = "1";
  fadeLayer.classList.add("visible");

  requestAnimationFrame(() => {
    fadeLayer.style.transition = `opacity ${duration}ms ease-in-out`;
    fadeLayer.style.opacity = "0";
  });

  runtime.visualizerCrossfadeTimer = window.setTimeout(() => {
    fadeLayer.classList.remove("visible");
    fadeLayer.style.transition = "none";
    fadeLayer.style.opacity = "0";
    fadeLayer.removeAttribute("src");
  }, duration + 80);
}

function isBlackAndWhiteVisualizerKey(visualizerKey) {
  return visualizerKey === "blackAndWhiteStatic" || visualizerKey === "blackAndWhiteCartonSpin";
}

function visualizerEaseDuration(visualizer, targetSpeedFactor) {
  const ease = visualizer?.motionEase || {};
  const fallbackDuration = ease.durationMs ?? 240;
  return targetSpeedFactor > 0
    ? (ease.inMs ?? fallbackDuration)
    : (ease.outMs ?? fallbackDuration);
}

function easeInOutCubic(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function setVisualizerMotionTarget(targetSpeedFactor, visualizer) {
  const clampedTarget = Math.max(0, Math.min(1, targetSpeedFactor));
  if (runtime.visualizerTargetSpeedFactor === clampedTarget) return;

  runtime.visualizerEaseStartFactor = runtime.visualizerSpeedFactor;
  runtime.visualizerTargetSpeedFactor = clampedTarget;
  runtime.visualizerEaseStartTime = performance.now();
  runtime.visualizerEaseDuration = visualizerEaseDuration(visualizer, clampedTarget);
}

function updateVisualizerMotionEase(timestamp) {
  if (runtime.visualizerEaseDuration <= 0) {
    runtime.visualizerSpeedFactor = runtime.visualizerTargetSpeedFactor;
    return;
  }

  const elapsed = timestamp - runtime.visualizerEaseStartTime;
  const progress = Math.max(0, Math.min(1, elapsed / runtime.visualizerEaseDuration));
  const easedProgress = easeInOutCubic(progress);
  const speedDelta = runtime.visualizerTargetSpeedFactor - runtime.visualizerEaseStartFactor;
  runtime.visualizerSpeedFactor = runtime.visualizerEaseStartFactor + speedDelta * easedProgress;

  if (progress >= 1) {
    runtime.visualizerSpeedFactor = runtime.visualizerTargetSpeedFactor;
    runtime.visualizerEaseDuration = 0;
  }
}

function startVisualizerPlayback(visualizerKey) {
  if (runtime.visualizerLoopFrame) return;
  runtime.visualizerLastFrameTime = performance.now();

  const tick = (timestamp) => {
    const visualizer = playerConfig.sequences.visualizers[visualizerKey];
    const shouldContinue = playerState.hatchOpen
      && playerState.currentSide === "front"
      && currentVisualizerKey() === visualizerKey;

    if (!visualizer || !shouldContinue) {
      runtime.visualizerLoopFrame = null;
      syncCurrentVisualizerFrame();
      return;
    }

    const framesPerSecond = visualizer.framesPerSecond || playerConfig.frameRate.visualizerFramesPerSecond;
    const elapsedSeconds = Math.min(Math.max(0, timestamp - runtime.visualizerLastFrameTime) / 1000, 0.25);
    runtime.visualizerLastFrameTime = timestamp;
    updateVisualizerMotionEase(timestamp);

    if (runtime.visualizerSpeedFactor > 0.001) {
      runtime.visualizerFrameAccumulator += elapsedSeconds * framesPerSecond * runtime.visualizerSpeedFactor;
    } else {
      runtime.visualizerFrameAccumulator = 0;
    }

    if (runtime.visualizerFrameAccumulator >= 1) {
      const frameSteps = Math.floor(runtime.visualizerFrameAccumulator);
      runtime.visualizerFrameAccumulator -= frameSteps;
      runtime.visualizerFrameIndex = (runtime.visualizerFrameIndex + frameSteps) % visualizerFrameCount(visualizer);
      syncCurrentVisualizerFrame();
    }

    if (runtime.visualizerTargetSpeedFactor === 0 && runtime.visualizerSpeedFactor <= 0.001) {
      runtime.visualizerSpeedFactor = 0;
      runtime.visualizerLoopFrame = null;
      syncCurrentVisualizerFrame();
      return;
    }

    runtime.visualizerLoopFrame = requestAnimationFrame(tick);
  };

  runtime.visualizerLoopFrame = requestAnimationFrame(tick);
}

function stopVisualizerPlayback(options = {}) {
  if (runtime.visualizerLoopFrame) cancelAnimationFrame(runtime.visualizerLoopFrame);
  runtime.visualizerLoopFrame = null;
  runtime.visualizerFrameAccumulator = 0;
  if (options.resetMotion) {
    runtime.visualizerSpeedFactor = 0;
    runtime.visualizerTargetSpeedFactor = 0;
    runtime.visualizerEaseStartFactor = 0;
    runtime.visualizerEaseStartTime = 0;
    runtime.visualizerEaseDuration = 0;
  }
}

function syncCurrentVisualizerFrame() {
  const visualizerKey = currentVisualizerKey();
  const visualizer = playerConfig.sequences.visualizers[visualizerKey];
  if (!visualizer) return;
  if (isLivePBJVisualizer(visualizer)) {
    runtime.layers.visualizerImage.style.visibility = "hidden";
    return;
  }

  const frameCount = visualizerFrameCount(visualizer);
  const frameIndex = ((runtime.visualizerFrameIndex % frameCount) + frameCount) % frameCount;
  const loadedFrames = runtime.visualizerFrameImagesByKey.get(visualizerKey);
  const loadedImage = loadedFrames && loadedFrames[frameIndex];

  if (loadedImage && loadedImage.complete && loadedImage.naturalWidth > 0) {
    drawFrame(runtime.layers.visualizerImage, loadedImage);
    return;
  }

  if (frameIndex === 0 || !runtime.layers.visualizerImage.src) {
    runtime.layers.visualizerImage.src = assetUrl(visualizerFramePath(visualizer, frameIndex));
  }
}

function isLivePBJVisualizer(visualizer) {
  return visualizer?.type === "livePBJ";
}

function startPBJVisualizer(visualizer) {
  if (!runtime.layers.pbjVisualizer || !visualizer) return;
  runtime.layers.pbjVisualizer.classList.add("visible");
  const renderResolution = visualizer.renderResolution || 512;
  if (runtime.layers.pbjVisualizer.width !== renderResolution) {
    runtime.layers.pbjVisualizer.width = renderResolution;
  }
  if (runtime.layers.pbjVisualizer.height !== renderResolution) {
    runtime.layers.pbjVisualizer.height = renderResolution;
  }

  const renderer = ensurePBJRenderer(runtime.layers.pbjVisualizer);
  if (!renderer) return;
  if (runtime.pbjAnimationFrame) return;

  runtime.pbjLastFrameTime = performance.now();
  const tick = (timestamp) => {
    const current = currentVisualizer();
    const shouldContinue = playerState.hatchOpen
      && playerState.currentSide === "front"
      && isLivePBJVisualizer(current);

    if (!shouldContinue) {
      stopPBJVisualizer();
      return;
    }

    const elapsedMilliseconds = timestamp - runtime.pbjLastFrameTime;
    const frameInterval = 1000 / (current.framesPerSecond || 30);
    if (elapsedMilliseconds < frameInterval) {
      runtime.pbjAnimationFrame = requestAnimationFrame(tick);
      return;
    }

    const elapsedSeconds = Math.min(Math.max(0, elapsedMilliseconds) / 1000, 0.25);
    runtime.pbjLastFrameTime = timestamp;
    updatePBJAudioLevel(elapsedSeconds, current);
    runtime.pbjRunningTime += elapsedSeconds;
    advancePBJMotionPhase(elapsedSeconds, current.metaball);
    renderPBJFrame(current);
    runtime.pbjAnimationFrame = requestAnimationFrame(tick);
  };

  runtime.pbjAnimationFrame = requestAnimationFrame(tick);
}

function stopPBJVisualizer() {
  if (runtime.pbjAnimationFrame) cancelAnimationFrame(runtime.pbjAnimationFrame);
  runtime.pbjAnimationFrame = null;
  if (runtime.layers.pbjVisualizer) runtime.layers.pbjVisualizer.classList.remove("visible");
}

function ensurePBJRenderer(canvas) {
  if (runtime.pbjWebGL?.canvas === canvas) return runtime.pbjWebGL;

  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true
  });
  if (!gl) return null;

  const vertexShader = compilePBJShader(gl, gl.VERTEX_SHADER, `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `);
  const fragmentShader = compilePBJShader(gl, gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 vUv;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uAudio;
    uniform float uIsoLevel;
    uniform float uObjectScale;
    uniform float uCameraFov;
    uniform float uTraceRadius;
    uniform float uNormalSampleOffset;
    uniform float uRoughnessMin;
    uniform float uRoughnessMax;
    uniform float uRoughnessContrast;
    uniform float uSpecular;
    uniform float uBloomIntensity;
    uniform float uSurfaceUVScale;
    uniform sampler2D uFingerprintsTexture;
    uniform sampler2D uAmbientOcclusionTexture;
    uniform int uBallCount;
    uniform vec4 uBalls[8];
    uniform vec3 uCameraLocation;
    uniform vec3 uPurpleDark;
    uniform vec3 uPurpleLight;
    uniform vec3 uRedDark;
    uniform vec3 uRedLight;
    uniform vec3 uKeyLight;
    uniform vec3 uFillLight;
    uniform vec3 uSoftFillLight;
    uniform vec3 uRimLight;
    uniform vec3 uFrontAccentLight;
    uniform vec3 uRearEdgeLight;
    uniform vec3 uKeyColor;
    uniform vec3 uFillColor;
    uniform vec3 uSoftFillColor;
    uniform vec3 uRimColor;
    uniform vec3 uFrontAccentColor;
    uniform vec3 uRearEdgeColor;
    uniform float uKeyIntensity;
    uniform float uFillIntensity;
    uniform float uSoftFillIntensity;
    uniform float uRimIntensity;
    uniform float uFrontAccentIntensity;
    uniform float uRearEdgeIntensity;

    float sampleField(vec3 p) {
      float field = 0.0;
      for (int i = 0; i < 8; i++) {
        if (i < uBallCount) {
          vec3 delta = p - uBalls[i].xyz;
          float radius = uBalls[i].w;
          field += (radius * radius) / max(dot(delta, delta), 1.0e-4);
        }
      }
      return field;
    }

    float hash31(vec3 p) {
      return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
    }

    float softNoise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
      float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
      float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
      float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
      float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
      float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
      float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
      float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
      float z0 = mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y);
      float z1 = mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y);
      return mix(z0, z1, f.z);
    }

    float cheapContrast(float value, float contrast) {
      return clamp(mix(contrast - 1.0, contrast + 1.0, value), 0.0, 1.0);
    }

    vec2 raySphere(vec3 origin, vec3 direction, float radius) {
      float b = dot(origin, direction);
      float c = dot(origin, origin) - radius * radius;
      float h = b * b - c;
      if (h < 0.0) return vec2(1.0, -1.0);
      h = sqrt(h);
      return vec2(-b - h, -b + h);
    }

    vec3 fieldNormal(vec3 p) {
      float offset = max(0.12, uNormalSampleOffset);
      vec3 gradient = vec3(
        sampleField(p + vec3(offset, 0.0, 0.0)) - sampleField(p - vec3(offset, 0.0, 0.0)),
        sampleField(p + vec3(0.0, offset, 0.0)) - sampleField(p - vec3(0.0, offset, 0.0)),
        sampleField(p + vec3(0.0, 0.0, offset)) - sampleField(p - vec3(0.0, 0.0, offset))
      );
      float gradientLength = length(gradient);
      if (gradientLength < 1.0e-5) return vec3(0.0, 0.0, 1.0);
      return -gradient / gradientLength;
    }

    void addPointLight(
      vec3 surface,
      vec3 normal,
      vec3 viewDir,
      vec3 lightPosition,
      vec3 lightColor,
      float intensity,
      float roughness,
      float specularStrength,
      inout vec3 diffuseLight,
      inout vec3 specularLight
    ) {
      vec3 lightVector = lightPosition - surface;
      float distanceToLight = length(lightVector);
      vec3 lightDir = lightVector / max(distanceToLight, 0.001);
      float diffuse = max(dot(normal, lightDir), 0.0);
      float attenuation = 1.0 / (1.0 + distanceToLight * distanceToLight / 175000.0);
      vec3 halfDir = normalize(lightDir + viewDir);
      float smoothness = 1.0 - roughness;
      float normalHalf = max(dot(normal, halfDir), 0.0);
      float sharpSpecular = pow(normalHalf, mix(18.0, 150.0, smoothness));
      float broadSpecular = pow(normalHalf, mix(5.0, 28.0, smoothness));
      float specular = (
        sharpSpecular * mix(0.12, 1.10, smoothness)
        + broadSpecular * mix(0.01, 0.08, smoothness)
      ) * specularStrength;
      float lightStrength = attenuation * (intensity / 430.0);
      diffuseLight += lightColor * diffuse * lightStrength;
      specularLight += lightColor * specular * lightStrength;
    }

    void main() {
      vec2 ndc = vUv * 2.0 - 1.0;
      float aspect = uResolution.x / max(uResolution.y, 1.0);
      float halfFov = radians(uCameraFov * 0.5);
      vec3 rayOrigin = uCameraLocation;
      vec3 rayDirection = normalize(vec3(1.0, ndc.x * aspect * tan(halfFov), ndc.y * tan(halfFov)));
      vec2 traceRange = raySphere(rayOrigin, rayDirection, uTraceRadius);
      if (traceRange.y <= traceRange.x || traceRange.y <= 0.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      float nearT = max(traceRange.x, 0.0);
      float farT = traceRange.y;
      float stepSize = (farT - nearT) / 96.0;
      float previousT = nearT;
      float previousValue = sampleField(rayOrigin + rayDirection * previousT) - uIsoLevel;
      float maximumField = max(previousValue + uIsoLevel, 0.0);
      float hitT = 0.0;
      float foundHit = 0.0;

      for (int stepIndex = 1; stepIndex <= 96; stepIndex++) {
        float currentT = nearT + stepSize * float(stepIndex);
        float currentField = sampleField(rayOrigin + rayDirection * currentT);
        float currentValue = currentField - uIsoLevel;
        maximumField = max(maximumField, currentField);
        if (currentValue >= 0.0 && previousValue < 0.0) {
          float lowT = previousT;
          float highT = currentT;
          for (int refineIndex = 0; refineIndex < 8; refineIndex++) {
            float middleT = (lowT + highT) * 0.5;
            float middleValue = sampleField(rayOrigin + rayDirection * middleT) - uIsoLevel;
            if (middleValue >= 0.0) highT = middleT;
            else lowT = middleT;
          }
          hitT = (lowT + highT) * 0.5;
          foundHit = 1.0;
          break;
        }
        previousT = currentT;
        previousValue = currentValue;
      }

      if (foundHit < 0.5) {
        float glow = smoothstep(uIsoLevel * 0.34, uIsoLevel * 0.96, maximumField)
          * 0.075 * uBloomIntensity;
        vec3 glowColor = mix(uPurpleLight, uRedLight, 0.52);
        gl_FragColor = vec4(glowColor * glow * 1.35, 1.0);
        return;
      }

      vec3 surface = rayOrigin + rayDirection * hitT;
      vec3 normal = fieldNormal(surface);
      vec3 viewDir = normalize(rayOrigin - surface);
      vec3 localSurface = surface / max(uObjectScale, 0.0001);
      vec2 surfaceUv = vec2(
        atan(normal.y, normal.x) / 6.28318530718 + 0.5,
        asin(clamp(normal.z, -1.0, 1.0)) / 3.14159265359 + 0.5
      ) * uSurfaceUVScale;
      float clayMask = texture2D(uFingerprintsTexture, surfaceUv).r;
      float ambientOcclusion = texture2D(uAmbientOcclusionTexture, surfaceUv).r;

      vec3 purple = mix(uPurpleDark, uPurpleLight, clayMask);
      vec3 red = mix(uRedDark, uRedLight, clayMask);
      float verticalBlend = clamp((localSurface.z + 120.0) / 240.0, 0.0, 1.0);
      vec3 baseColor = mix(purple, red, verticalBlend);
      float roughnessMask = cheapContrast(clayMask, uRoughnessContrast);
      float roughness = clamp(mix(uRoughnessMin, uRoughnessMax, roughnessMask), 0.0, 1.0);

      vec3 diffuseLight = vec3(0.10 * mix(0.72, 1.0, ambientOcclusion));
      vec3 specularLight = vec3(0.0);
      addPointLight(surface, normal, viewDir, uKeyLight, uKeyColor, uKeyIntensity, roughness, uSpecular, diffuseLight, specularLight);
      addPointLight(surface, normal, viewDir, uFillLight, uFillColor, uFillIntensity, roughness, uSpecular, diffuseLight, specularLight);
      addPointLight(surface, normal, viewDir, uSoftFillLight, uSoftFillColor, uSoftFillIntensity, roughness, uSpecular, diffuseLight, specularLight);
      addPointLight(surface, normal, viewDir, uRimLight, uRimColor, uRimIntensity, roughness, uSpecular, diffuseLight, specularLight);
      addPointLight(surface, normal, viewDir, uFrontAccentLight, uFrontAccentColor, uFrontAccentIntensity, roughness, uSpecular, diffuseLight, specularLight);
      addPointLight(surface, normal, viewDir, uRearEdgeLight, uRearEdgeColor, uRearEdgeIntensity, roughness, uSpecular, diffuseLight, specularLight);
      vec3 color = baseColor * diffuseLight + specularLight;
      color = clamp(
        (color * (2.51 * color + vec3(0.03)))
          / (color * (2.43 * color + vec3(0.59)) + vec3(0.14)),
        0.0,
        1.0
      );
      color = pow(max(color, vec3(0.0)), vec3(1.0 / 2.2));

      gl_FragColor = vec4(color, 1.0);
    }
  `);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(program));
    return null;
  }

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1
  ]), gl.STATIC_DRAW);

  const uniforms = {};
  [
    "uResolution", "uTime", "uAudio", "uIsoLevel", "uObjectScale", "uCameraFov",
    "uTraceRadius", "uNormalSampleOffset", "uRoughnessMin", "uRoughnessMax", "uRoughnessContrast",
    "uSpecular", "uBloomIntensity", "uSurfaceUVScale", "uFingerprintsTexture", "uAmbientOcclusionTexture",
    "uBallCount", "uBalls", "uCameraLocation", "uPurpleDark", "uPurpleLight",
    "uRedDark", "uRedLight", "uKeyLight", "uFillLight", "uSoftFillLight", "uRimLight",
    "uFrontAccentLight", "uRearEdgeLight", "uKeyColor", "uFillColor", "uSoftFillColor", "uRimColor",
    "uFrontAccentColor", "uRearEdgeColor", "uKeyIntensity", "uFillIntensity", "uSoftFillIntensity",
    "uRimIntensity", "uFrontAccentIntensity", "uRearEdgeIntensity"
  ].forEach((name) => {
    uniforms[name] = gl.getUniformLocation(program, name === "uBalls" ? "uBalls[0]" : name);
  });

  const material = playerConfig.sequences.visualizers.defaultPBJSlime.material;
  const textures = {
    fingerprints: createPBJTexture(gl, material.fingerprintsTexture, [128, 128, 128, 255]),
    ambientOcclusion: createPBJTexture(gl, material.ambientOcclusionTexture, [255, 255, 255, 255])
  };

  runtime.pbjWebGL = {
    canvas,
    gl,
    program,
    vertexBuffer,
    aPosition: gl.getAttribLocation(program, "aPosition"),
    uniforms,
    textures,
    balls: new Float32Array(8 * 4)
  };
  return runtime.pbjWebGL;
}

function compilePBJShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function createPBJTexture(gl, relativePath, fallbackPixel) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array(fallbackPixel)
  );

  const image = new Image();
  image.decoding = "async";
  image.addEventListener("load", () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  });
  image.addEventListener("error", () => {
    console.warn(`Could not load PBJ material texture: ${relativePath}`);
  });
  image.src = assetUrl(relativePath);
  return texture;
}

function renderPBJFrame(visualizer) {
  const renderer = runtime.pbjWebGL;
  if (!renderer) return;

  const { gl, canvas, program, vertexBuffer, aPosition, uniforms, textures, balls } = renderer;
  const pbj = visualizer.metaball;
  const capture = visualizer.capture;
  const material = visualizer.material;
  const lighting = visualizer.lighting;
  const ballCount = buildPBJBalls(visualizer, balls);
  const componentScale = pbj.componentScale || 0.175;
  const traceRadius = pbjTraceRadius(balls, ballCount, pbj);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures.fingerprints);
  gl.uniform1i(uniforms.uFingerprintsTexture, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, textures.ambientOcclusion);
  gl.uniform1i(uniforms.uAmbientOcclusionTexture, 1);

  gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
  gl.uniform1f(uniforms.uTime, quantizedPBJTime(pbj));
  gl.uniform1f(uniforms.uAudio, runtime.pbjSmoothedAudioLevel);
  gl.uniform1f(uniforms.uIsoLevel, pbj.isoLevel);
  gl.uniform1f(uniforms.uObjectScale, componentScale);
  gl.uniform1f(uniforms.uCameraFov, capture.fovAngle);
  gl.uniform1f(uniforms.uTraceRadius, traceRadius);
  gl.uniform1f(uniforms.uNormalSampleOffset, pbj.normalSampleOffset * componentScale);
  gl.uniform1f(uniforms.uRoughnessMin, material.roughnessMin);
  gl.uniform1f(uniforms.uRoughnessMax, material.roughnessMax);
  gl.uniform1f(uniforms.uRoughnessContrast, material.roughnessContrast);
  gl.uniform1f(uniforms.uSpecular, material.specular);
  gl.uniform1f(uniforms.uBloomIntensity, material.bloomIntensity);
  gl.uniform1f(uniforms.uSurfaceUVScale, pbj.surfaceUVScale);
  gl.uniform1i(uniforms.uBallCount, ballCount);
  gl.uniform4fv(uniforms.uBalls, balls);
  gl.uniform3fv(uniforms.uCameraLocation, new Float32Array(capture.cameraLocation));
  gl.uniform3fv(uniforms.uPurpleDark, new Float32Array(material.purpleDark));
  gl.uniform3fv(uniforms.uPurpleLight, new Float32Array(material.purpleLight));
  gl.uniform3fv(uniforms.uRedDark, new Float32Array(material.redDark));
  gl.uniform3fv(uniforms.uRedLight, new Float32Array(material.redLight));
  gl.uniform3f(uniforms.uKeyLight, lighting.key.x, lighting.key.y, lighting.key.z);
  gl.uniform3f(uniforms.uFillLight, lighting.fill.x, lighting.fill.y, lighting.fill.z);
  gl.uniform3f(uniforms.uSoftFillLight, lighting.softFill.x, lighting.softFill.y, lighting.softFill.z);
  gl.uniform3f(uniforms.uRimLight, lighting.rim.x, lighting.rim.y, lighting.rim.z);
  gl.uniform3f(uniforms.uFrontAccentLight, lighting.frontAccent.x, lighting.frontAccent.y, lighting.frontAccent.z);
  gl.uniform3f(uniforms.uRearEdgeLight, lighting.rearEdge.x, lighting.rearEdge.y, lighting.rearEdge.z);
  gl.uniform3fv(uniforms.uKeyColor, new Float32Array(lighting.key.color));
  gl.uniform3fv(uniforms.uFillColor, new Float32Array(lighting.fill.color));
  gl.uniform3fv(uniforms.uSoftFillColor, new Float32Array(lighting.softFill.color));
  gl.uniform3fv(uniforms.uRimColor, new Float32Array(lighting.rim.color));
  gl.uniform3fv(uniforms.uFrontAccentColor, new Float32Array(lighting.frontAccent.color));
  gl.uniform3fv(uniforms.uRearEdgeColor, new Float32Array(lighting.rearEdge.color));
  gl.uniform1f(uniforms.uKeyIntensity, lighting.key.intensity);
  gl.uniform1f(uniforms.uFillIntensity, lighting.fill.intensity);
  gl.uniform1f(uniforms.uSoftFillIntensity, lighting.softFill.intensity);
  gl.uniform1f(uniforms.uRimIntensity, lighting.rim.intensity);
  gl.uniform1f(uniforms.uFrontAccentIntensity, lighting.frontAccent.intensity);
  gl.uniform1f(uniforms.uRearEdgeIntensity, lighting.rearEdge.intensity);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function buildPBJBalls(visualizer, target) {
  const pbj = visualizer.metaball;
  const music = runtime.pbjSmoothedAudioLevel * runtime.pbjSmoothedAudioLevel;
  const motionPhase = quantizedPBJMotionPhase(pbj);
  const componentScale = pbj.componentScale || 0.175;
  const count = Math.max(0, Math.min(7, pbj.dropletCount));
  let offset = 0;

  target[offset++] = 0;
  target[offset++] = 0;
  target[offset++] = 0;
  target[offset++] = pbj.mainRadius * (1 + music * 0.08) * componentScale;

  for (let index = 0; index < count; index += 1) {
    const seed = index;
    const phase = (seed / Math.max(1, count)) * Math.PI * 2;
    const t = motionPhase;
    const reachPulse = 0.5 + 0.5 * Math.sin(t * (0.77 + seed * 0.061) + phase * 1.7);
    const orbitRadius = pbj.dropletOrbitRadius + pbj.reactiveReach * music * reachPulse;
    const verticalSwing = (pbj.verticalBaseReach + pbj.verticalReactiveReach * music)
      * Math.sin(t * (1.13 + seed * 0.047) + phase * 0.63);
    const centerX = orbitRadius * Math.cos(t * (0.82 + seed * 0.033) + phase);
    const centerY = orbitRadius * Math.sin(t * (0.69 + seed * 0.041) + phase * 1.31);
    const radiusPulse = 0.5 + 0.5 * Math.sin(t * (1.41 + seed * 0.052) + phase * 2.2);

    target[offset++] = centerX * componentScale;
    target[offset++] = centerY * componentScale;
    target[offset++] = verticalSwing * componentScale;
    target[offset++] = (pbj.dropletRadius + pbj.dropletReactiveRadius * music * radiusPulse) * componentScale;
  }

  for (; offset < target.length; offset += 1) target[offset] = 0;
  return count + 1;
}

function pbjTraceRadius(balls, ballCount, pbj) {
  const safeIsoLevel = Math.max(pbj.isoLevel, 0.01);
  const componentScale = pbj.componentScale || 0.175;
  let traceRadius = Math.max(pbj.boundsExtent, pbj.mainRadius) * componentScale;
  for (let index = 0; index < ballCount; index += 1) {
    const offset = index * 4;
    const centerExtent = Math.max(
      Math.abs(balls[offset]),
      Math.abs(balls[offset + 1]),
      Math.abs(balls[offset + 2])
    );
    const surfaceRadius = balls[offset + 3] / Math.sqrt(safeIsoLevel);
    const solveMargin = Math.max(160 * componentScale, balls[offset + 3] * 2);
    traceRadius = Math.max(traceRadius, centerExtent + surfaceRadius + solveMargin);
  }
  return traceRadius;
}

function quantizedPBJTime(pbj) {
  if (!pbj.stopMotionFPS || pbj.stopMotionFPS <= 0) return runtime.pbjRunningTime;
  return Math.floor(runtime.pbjRunningTime * pbj.stopMotionFPS) / pbj.stopMotionFPS;
}

function advancePBJMotionPhase(deltaSeconds, pbj) {
  const music = runtime.pbjSmoothedAudioLevel * runtime.pbjSmoothedAudioLevel;
  const speed = pbj.baseMotionSpeed + pbj.audioMotionBoost * music;
  runtime.pbjMotionPhase += deltaSeconds * speed;
}

function quantizedPBJMotionPhase(pbj) {
  if (!pbj.stopMotionFPS || pbj.stopMotionFPS <= 0) return runtime.pbjMotionPhase;
  return Math.floor(runtime.pbjMotionPhase * pbj.stopMotionFPS) / pbj.stopMotionFPS;
}

function updatePBJAudioLevel(deltaSeconds, visualizer) {
  runtime.pbjRawAudioLevel = playerState.isPlaying ? readCurrentTrackAudioLevel(visualizer) : 0;
  const interpSpeed = visualizer.metaball.audioInterpSpeed || visualizer.actor.audioInterpSpeed || 8;
  const alpha = Math.max(0, Math.min(1, deltaSeconds * interpSpeed));
  runtime.pbjSmoothedAudioLevel += (runtime.pbjRawAudioLevel - runtime.pbjSmoothedAudioLevel) * alpha;
}

function readCurrentTrackAudioLevel(visualizer) {
  if (!runtime.currentTrackAudio || runtime.currentTrackAudio.paused) return 0;
  const envelope = currentTrackEnvelopeLevel();
  if (envelope === null) return 0;

  const calibration = visualizer.audioCalibration || {};
  const noiseFloor = calibration.noiseFloor ?? 0;
  const ceiling = Math.max(noiseFloor + 0.001, calibration.ceiling ?? 1);
  const responseExponent = Math.max(0.01, calibration.responseExponent ?? 1);
  const gainedEnvelope = envelope * (visualizer.audioGain || 1);
  const normalized = Math.max(0, Math.min(1, (gainedEnvelope - noiseFloor) / (ceiling - noiseFloor)));
  return Math.pow(normalized, responseExponent);
}

function currentTrackEnvelopeLevel() {
  const envelope = runtime.analysisEnvelope;
  if (envelope?.values?.length) {
    const framePosition = runtime.currentTrackAudio.currentTime * envelope.framesPerSecond;
    const firstIndex = Math.max(0, Math.min(envelope.values.length - 1, Math.floor(framePosition)));
    const secondIndex = Math.min(envelope.values.length - 1, firstIndex + 1);
    const blend = Math.max(0, Math.min(1, framePosition - firstIndex));
    return (envelope.values[firstIndex] * (1 - blend) + envelope.values[secondIndex] * blend) / 255;
  }

  if (!runtime.analysisBuffer) return null;
  const buffer = runtime.analysisBuffer;
  const windowFrameCount = Math.max(256, Math.round(buffer.sampleRate * 0.04644));
  const centerFrame = Math.round(runtime.currentTrackAudio.currentTime * buffer.sampleRate);
  const firstFrame = Math.max(0, Math.min(
    Math.max(0, buffer.length - windowFrameCount),
    centerFrame - Math.floor(windowFrameCount / 2)
  ));
  let sumSquares = 0;
  let sampleCount = 0;
  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const channel = buffer.getChannelData(channelIndex);
    const lastFrame = Math.min(channel.length, firstFrame + windowFrameCount);
    for (let frameIndex = firstFrame; frameIndex < lastFrame; frameIndex += 1) {
      const sample = channel[frameIndex];
      sumSquares += sample * sample;
      sampleCount += 1;
    }
  }
  return sampleCount ? Math.sqrt(sumSquares / sampleCount) : 0;
}

function syncBlackAndWhiteStaticOverlay() {
  const staticVisualizer = playerConfig.sequences.visualizers.blackAndWhiteStatic;
  const layer = runtime.layers.visualizerCrossfadeImage;
  const visible = playerState.activeSkinMode === "blackAndWhite"
    && playerState.currentSide === "front"
    && playerState.hatchOpen
    && Boolean(staticVisualizer);

  if (!visible) {
    stopBlackAndWhiteStaticOverlay();
    stopBlackAndWhiteStaticTransition({ settleToCurrent: true });
    syncBlackAndWhiteBaseVisualizerVisibility();
    layer.classList.remove("visible");
    layer.style.transition = "none";
    layer.style.opacity = "0";
    return;
  }

  applyImageWidgetLayout(layer, playerConfig.visualizerMaskPanel.blackAndWhiteStaticOverlay);
  layer.style.transition = "none";
  layer.classList.add("visible");
  preloadVisualizerFrames("blackAndWhiteStatic");
  syncBlackAndWhiteStaticOverlayFrame();
  startBlackAndWhiteStaticOverlayLoop();
  syncBlackAndWhiteStaticTransition();
  applyBlackAndWhiteStaticOverlayOpacity();
  syncBlackAndWhiteBaseVisualizerVisibility();
}

function syncBlackAndWhiteStaticTransition() {
  const requestedIsPlaying = playerState.isPlaying;

  if (runtime.blackAndWhiteIsTransitioning) {
    if (runtime.blackAndWhitePendingIsPlaying !== requestedIsPlaying) {
      runtime.blackAndWhitePendingIsPlaying = requestedIsPlaying;
      runtime.blackAndWhiteTransitionStartTime = performance.now();
      runtime.blackAndWhiteTransitionTickCounter = 0;
    }
    startBlackAndWhiteStaticTransition();
    return;
  }

  if (runtime.blackAndWhiteDisplayedIsPlaying === requestedIsPlaying) return;

  runtime.blackAndWhitePendingIsPlaying = requestedIsPlaying;
  runtime.blackAndWhiteIsTransitioning = true;
  runtime.blackAndWhiteTransitionStartTime = performance.now();
  runtime.blackAndWhiteTransitionTickCounter = 0;
  startBlackAndWhiteStaticTransition();
}

function startBlackAndWhiteStaticTransition() {
  if (runtime.blackAndWhiteTransitionFrame) return;

  const tick = (timestamp) => {
    const visible = playerState.activeSkinMode === "blackAndWhite"
      && playerState.currentSide === "front"
      && playerState.hatchOpen
      && Boolean(playerConfig.sequences.visualizers.blackAndWhiteStatic);

    if (!visible || !runtime.blackAndWhiteIsTransitioning) {
      runtime.blackAndWhiteTransitionFrame = null;
      return;
    }

    const transition = blackAndWhiteStaticTransitionConfig();
    const tickRate = transition.tickRate || 60;
    const finishTick = transition.finishTick || 168;
    const displaySwitchTick = transition.displaySwitchTick ?? 1;
    runtime.blackAndWhiteTransitionTickCounter = Math.min(
      finishTick,
      Math.floor((timestamp - runtime.blackAndWhiteTransitionStartTime) / (1000 / tickRate))
    );

    if (runtime.blackAndWhiteTransitionTickCounter >= displaySwitchTick) {
      runtime.blackAndWhiteDisplayedIsPlaying = runtime.blackAndWhitePendingIsPlaying;
    }

    applyBlackAndWhiteStaticOverlayOpacity();

    if (runtime.blackAndWhiteTransitionTickCounter >= finishTick) {
      runtime.blackAndWhiteIsTransitioning = false;
      runtime.blackAndWhiteDisplayedIsPlaying = runtime.blackAndWhitePendingIsPlaying;
      runtime.blackAndWhiteTransitionFrame = null;
      applyBlackAndWhiteStaticOverlayOpacity();
      syncBlackAndWhiteStaticAudio();
      return;
    }

    runtime.blackAndWhiteTransitionFrame = requestAnimationFrame(tick);
  };

  runtime.blackAndWhiteTransitionFrame = requestAnimationFrame(tick);
}

function stopBlackAndWhiteStaticTransition(options = {}) {
  if (runtime.blackAndWhiteTransitionFrame) {
    cancelAnimationFrame(runtime.blackAndWhiteTransitionFrame);
  }
  runtime.blackAndWhiteTransitionFrame = null;
  runtime.blackAndWhiteIsTransitioning = false;
  runtime.blackAndWhiteTransitionTickCounter = 0;

  if (options.settleToCurrent) {
    runtime.blackAndWhiteDisplayedIsPlaying = playerState.isPlaying;
    runtime.blackAndWhitePendingIsPlaying = playerState.isPlaying;
  }
}

function blackAndWhiteStaticTransitionConfig() {
  return playerConfig.sequences.visualizers.blackAndWhiteStatic?.phaseTransition || {
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
  };
}

function blackAndWhiteStaticOverlayOpacity() {
  if (!runtime.blackAndWhiteIsTransitioning) {
    return runtime.blackAndWhiteDisplayedIsPlaying ? 0 : 1;
  }

  const transition = blackAndWhiteStaticTransitionConfig();
  const phases = runtime.blackAndWhitePendingIsPlaying ? transition.toPlaying : transition.toPaused;
  if (!Array.isArray(phases) || !phases.length) return runtime.blackAndWhitePendingIsPlaying ? 0 : 1;

  return phases.reduce((opacity, phase) => (
    runtime.blackAndWhiteTransitionTickCounter >= phase.tick ? phase.opacity : opacity
  ), phases[0].opacity);
}

function applyBlackAndWhiteStaticOverlayOpacity() {
  const layer = runtime.layers.visualizerCrossfadeImage;
  if (!layer) return;
  layer.style.opacity = String(blackAndWhiteStaticOverlayOpacity());
  syncBlackAndWhiteBaseVisualizerVisibility();
}

function syncBlackAndWhiteBaseVisualizerVisibility() {
  const shouldHidePBJImage = isLivePBJVisualizer(currentVisualizer());
  runtime.layers.visualizerImage.style.visibility = shouldHideBlackAndWhiteCartonBase() || shouldHidePBJImage ? "hidden" : "";
}

function shouldHideBlackAndWhiteCartonBase() {
  return playerState.activeSkinMode === "blackAndWhite"
    && playerState.currentSide === "front"
    && playerState.hatchOpen
    && !runtime.blackAndWhiteIsTransitioning
    && !runtime.blackAndWhiteDisplayedIsPlaying;
}

function startBlackAndWhiteStaticOverlayLoop() {
  if (runtime.blackAndWhiteStaticOverlayLoopFrame) return;
  runtime.blackAndWhiteStaticOverlayLastFrameTime = performance.now();

  const tick = (timestamp) => {
    const staticVisualizer = playerConfig.sequences.visualizers.blackAndWhiteStatic;
    const visible = playerState.activeSkinMode === "blackAndWhite"
      && playerState.currentSide === "front"
      && playerState.hatchOpen
      && Boolean(staticVisualizer);

    if (!visible) {
      stopBlackAndWhiteStaticOverlay();
      return;
    }

    const framesPerSecond = staticVisualizer.framesPerSecond || playerConfig.frameRate.visualizerFramesPerSecond;
    const elapsedSeconds = Math.min(Math.max(0, timestamp - runtime.blackAndWhiteStaticOverlayLastFrameTime) / 1000, 0.25);
    runtime.blackAndWhiteStaticOverlayLastFrameTime = timestamp;
    runtime.blackAndWhiteStaticOverlayFrameAccumulator += elapsedSeconds * framesPerSecond;

    if (runtime.blackAndWhiteStaticOverlayFrameAccumulator >= 1) {
      const frameSteps = Math.floor(runtime.blackAndWhiteStaticOverlayFrameAccumulator);
      runtime.blackAndWhiteStaticOverlayFrameAccumulator -= frameSteps;
      runtime.blackAndWhiteStaticOverlayFrameIndex = (
        runtime.blackAndWhiteStaticOverlayFrameIndex + frameSteps
      ) % visualizerFrameCount(staticVisualizer);
      syncBlackAndWhiteStaticOverlayFrame();
    }

    runtime.blackAndWhiteStaticOverlayLoopFrame = requestAnimationFrame(tick);
  };

  runtime.blackAndWhiteStaticOverlayLoopFrame = requestAnimationFrame(tick);
}

function stopBlackAndWhiteStaticOverlay() {
  if (runtime.blackAndWhiteStaticOverlayLoopFrame) {
    cancelAnimationFrame(runtime.blackAndWhiteStaticOverlayLoopFrame);
  }
  runtime.blackAndWhiteStaticOverlayLoopFrame = null;
  runtime.blackAndWhiteStaticOverlayFrameAccumulator = 0;
}

function syncBlackAndWhiteStaticOverlayFrame() {
  const staticVisualizer = playerConfig.sequences.visualizers.blackAndWhiteStatic;
  const layer = runtime.layers.visualizerCrossfadeImage;
  if (!staticVisualizer || !layer) return;

  const frameCount = visualizerFrameCount(staticVisualizer);
  const frameIndex = ((runtime.blackAndWhiteStaticOverlayFrameIndex % frameCount) + frameCount) % frameCount;
  const loadedFrames = runtime.visualizerFrameImagesByKey.get("blackAndWhiteStatic");
  const loadedImage = loadedFrames && loadedFrames[frameIndex];

  if (loadedImage && loadedImage.complete && loadedImage.naturalWidth > 0) {
    drawFrame(layer, loadedImage);
    return;
  }

  if (frameIndex === 0 || !layer.src) {
    layer.src = assetUrl(visualizerFramePath(staticVisualizer, frameIndex));
  }
}

function syncBlackAndWhiteStaticAudio() {
  const shouldPlay = playerState.activeSkinMode === "blackAndWhite"
    && playerState.currentSide === "front"
    && playerState.hatchOpen
    && !playerState.isPlaying
    && Boolean(playerConfig.sequences.visualizers.blackAndWhiteStatic?.staticAudio);

  if (shouldPlay) {
    if (!runtime.blackAndWhiteStaticAudio) {
      runtime.blackAndWhiteStaticAudio = loopAudio(
        playerConfig.audio.blackAndWhiteStatic,
        audioMix.ambientLoops,
        { overlapSeconds: 0.08 }
      );
    } else {
      resumeAudio(runtime.blackAndWhiteStaticAudio);
    }
    return;
  }

  if (runtime.blackAndWhiteStaticAudio) {
    stopAudio(runtime.blackAndWhiteStaticAudio);
    runtime.blackAndWhiteStaticAudio = null;
  }
}

function syncNPSkin() {
  const shouldBeVisible = playerState.isPlaying && playerState.currentSide === "front";
  if (shouldBeVisible && (!runtime.npVisible || runtime.npTransition === "out")) {
    animateNPSkinIn();
  } else if (!shouldBeVisible && (runtime.npVisible || runtime.npTransition === "in")) {
    animateNPSkinOut();
  } else if (shouldBeVisible) {
    runtime.layers.npSkinRoot.classList.add("visible");
  }
}

function animateNPSkinIn() {
  clearNPAnimationTimers();
  stopNPHover();
  const movement = playerConfig.npSkinRoot.movement;
  const firstDuration = movement.progressStep > 0 ? 1000 / (movement.progressStep * 60) : 210;
  const animationToken = ++runtime.npAnimationToken;
  runtime.npVisible = true;
  runtime.npTransition = "in";
  runtime.layers.npSkinRoot.classList.add("visible");
  setNPTranslation(movement.start);

  requestAnimationFrame(() => {
    if (animationToken !== runtime.npAnimationToken) return;
    runtime.layers.npSkinRoot.style.transition = `transform ${firstDuration}ms ease-out`;
    setNPTranslation(movement.peak);
    const settleTimer = window.setTimeout(() => {
      runtime.npAnimationTimers.delete(settleTimer);
      if (animationToken !== runtime.npAnimationToken) return;
      runtime.layers.npSkinRoot.style.transition = `transform ${firstDuration}ms ease-in-out`;
      setNPTranslation(movement.out);
      const hoverTimer = window.setTimeout(() => {
        runtime.npAnimationTimers.delete(hoverTimer);
        if (animationToken !== runtime.npAnimationToken) return;
        runtime.npTransition = null;
        if (playerState.isPlaying && playerState.currentSide === "front") startNPHover();
        else animateNPSkinOut();
      }, firstDuration);
      runtime.npAnimationTimers.add(hoverTimer);
    }, firstDuration);
    runtime.npAnimationTimers.add(settleTimer);
  });
}

function animateNPSkinOut() {
  clearNPAnimationTimers();
  stopNPHover();
  if (!runtime.npVisible && runtime.npTransition !== "in") return Promise.resolve();

  const movement = playerConfig.npSkinRoot.movement;
  const duration = movement.progressStep > 0 ? 1000 / (movement.progressStep * 60) : 210;
  const animationToken = ++runtime.npAnimationToken;
  runtime.npVisible = false;
  runtime.npTransition = "out";
  runtime.layers.npSkinRoot.classList.add("visible");
  runtime.layers.npSkinRoot.style.transition = `transform ${duration}ms ease-in`;
  setNPTranslation(movement.start);

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      runtime.npAnimationTimers.delete(timer);
      if (animationToken !== runtime.npAnimationToken) {
        resolve();
        return;
      }
      runtime.npTransition = null;
      runtime.layers.npSkinRoot.classList.remove("visible");
      runtime.layers.npSkinRoot.style.transition = "none";
      setNPTranslation(movement.start);
      resolve();
    }, duration);
    runtime.npAnimationTimers.add(timer);
  });
}

function startNPHover() {
  const movement = playerConfig.npSkinRoot.movement;
  runtime.npHoverTime = 0;

  const tick = () => {
    if (!runtime.npVisible) return;
    runtime.npHoverTime += movement.hoverTimeStep;
    setNPTranslation({
      x: movement.out.x,
      y: movement.out.y + Math.sin(runtime.npHoverTime) * movement.hoverAmplitude
    });
    runtime.npHoverTimer = window.setTimeout(tick, 1000 / 60);
  };

  runtime.layers.npSkinRoot.style.transition = "none";
  tick();
}

function stopNPHover() {
  if (runtime.npHoverTimer) window.clearTimeout(runtime.npHoverTimer);
  runtime.npHoverTimer = null;
}

function clearNPAnimationTimers() {
  runtime.npAnimationTimers.forEach((timer) => window.clearTimeout(timer));
  runtime.npAnimationTimers.clear();
}

function hideNPSkinForRotation() {
  return animateNPSkinOut();
}

function setNPTranslation(position) {
  runtime.layers.npSkinRoot.style.transform = `translate(${position.x}px, ${position.y}px)`;
}

async function extendTrackslimes() {
  playOneShot(playerConfig.audio.trackslimesOpen);
  runtime.layers.trackslimes.classList.remove("visible");
  await animateImageSequence(runtime.layers.trackslimesAnimation, featureSequence(playerConfig.sequences.features.trackslimes));
  playerState.trackslimesExtended = true;
  renderState();
}

async function retractTrackslimes() {
  playOneShot(playerConfig.audio.trackslimesRetract);
  await animateImageSequence(runtime.layers.trackslimesAnimation, featureSequence(playerConfig.sequences.features.trackslimes), {
    reverse: true,
    onReady: () => runtime.layers.trackslimes.classList.remove("visible")
  });
  playerState.trackslimesExtended = false;
  renderState();
}

async function extendBBNetworkRing() {
  const feature = bbNetworkRingFeature();
  const appearSequence = {
    folder: feature.folder,
    frames: frameRange(feature.firstFrame, feature.loopStartFrame)
  };
  const loopSequence = bbNetworkRingLoopSequence(feature);
  const [loopImages] = await Promise.all([
    preloadSequence(loopSequence),
    preloadSequence(appearSequence)
  ]);
  playOneShot(playerConfig.audio.bbNetworkRingAppear);
  await animateImageSequence(runtime.layers.bbNetworkRingAnimation, appearSequence, { keepLastFrame: true, keepVisible: true });
  playerState.bbNetworkRingPlaying = true;
  runtime.beaconSoundAudio = loopAudio(playerConfig.audio.beaconSound, audioMix.ambientLoops);
  runtime.beaconBackgroundAudio = loopAudio(playerConfig.audio.beaconBackground, audioMix.ambientLoops);
  startBBNetworkRingLoop(loopImages);
  renderState();
}

async function retractBBNetworkRing() {
  const feature = bbNetworkRingFeature();
  const retractSequence = {
    folder: feature.folder,
    frames: frameRange(`${String(runtime.bbNetworkRingLoopFrameIndex || frameNumber(feature.loopEndFrame)).padStart(4, "0")}.png`, feature.lastFrame)
  };
  const retractImages = await preloadSequence(retractSequence);
  runtime.layers.bbNetworkRingAnimation.classList.add("playing");
  stopBBNetworkRingLoop();
  stopAudio(runtime.beaconSoundAudio);
  stopAudio(runtime.beaconBackgroundAudio);
  playOneShot(playerConfig.audio.bbNetworkRingRetract);
  await animateImageSequence(runtime.layers.bbNetworkRingAnimation, retractSequence, {
    frameDelayMultiplier: playerConfig.frameRate.bbNetworkRingRetractMultiplier,
    preloadedImages: retractImages
  });
  playerState.bbNetworkRingPlaying = false;
  renderState();
}

function startBBNetworkRingLoop(preloadedRingImages = null) {
  const feature = bbNetworkRingFeature();
  const ringFrames = frameRange(feature.loopStartFrame, feature.loopEndFrame);
  const ringImages = preloadedRingImages || [];
  runtime.layers.bbNetworkRingAnimation.classList.add("looping");
  if (!preloadedRingImages) {
    const ringPaths = frames(feature.folder, ringFrames);
    preloadImagesInBatchesWithProgress(ringPaths, 8, (index, image) => {
      ringImages[index] = image;
    });
  }
  const frameDelay = 1000 / playerConfig.frameRate.defaultFramesPerSecond;
  const startTime = performance.now();
  let lastIndex = -1;

  const tick = (now) => {
    if (!playerState.bbNetworkRingPlaying) return;
    const index = Math.floor((now - startTime) / frameDelay) % ringFrames.length;
    if (index === lastIndex) {
      runtime.bbNetworkRingLoopTimer = requestAnimationFrame(tick);
      return;
    }

    const image = ringImages[index] || ringImages[lastIndex] || ringImages[0];
    if (!image) {
      runtime.bbNetworkRingLoopTimer = requestAnimationFrame(tick);
      return;
    }

    const frameName = ringFrames[index];
    runtime.bbNetworkRingLoopFrameIndex = frameNumber(frameName);
    drawFrame(runtime.layers.bbNetworkRingAnimation, image);
    runtime.layers.bbNetworkRingAnimation.classList.remove("playing");
    lastIndex = index;
    runtime.bbNetworkRingLoopTimer = requestAnimationFrame(tick);
  };

  runtime.bbNetworkRingLoopTimer = requestAnimationFrame(tick);
}

function stopBBNetworkRingLoop() {
  if (runtime.bbNetworkRingLoopTimer) cancelAnimationFrame(runtime.bbNetworkRingLoopTimer);
  runtime.bbNetworkRingLoopTimer = null;
  runtime.layers.bbNetworkRingAnimation.classList.remove("looping");
}

function featureSequence(feature) {
  return {
    folder: feature.folder,
    frames: frameRange(feature.firstFrame, feature.lastFrame)
  };
}

function bbNetworkRingLoopSequence(feature) {
  return {
    folder: feature.folder,
    frames: frameRange(feature.loopStartFrame, feature.loopEndFrame)
  };
}

function bbNetworkRingFeature() {
  const feature = playerConfig.sequences.features.bbNetworkRing;
  return {
    ...feature,
    folder: playerState.activeSkinMode === "blackAndWhite"
      ? feature.blackAndWhiteFolder
      : feature.folder
  };
}

function skeletonArmSequence(mode = playerState.activeSkinMode) {
  const feature = playerConfig.sequences.features.skeletonArm;
  return {
    folder: mode === "blackAndWhite"
      ? "rotation/_b&w/_skeletonarmswing"
      : feature.folder,
    frames: frameRange(feature.firstFrame, feature.lastFrame)
  };
}

function rotationAssetFolder(folderName, mode = playerState.activeSkinMode) {
  return mode === "blackAndWhite"
    ? `rotation/_b&w/${folderName}`
    : `rotation/${folderName}`;
}

function rotationSequence(transition, mode = playerState.activeSkinMode) {
  return {
    folder: rotationAssetFolder(transition.folderName, mode),
    frames: mode === "blackAndWhite"
      ? blackAndWhiteFrameRange(transition.firstFrame, transition.lastFrame)
      : frameRange(transition.firstFrame, transition.lastFrame)
  };
}

function blackAndWhiteFrameRange(firstFrame, lastFrame) {
  const first = frameNumber(firstFrame);
  const last = frameNumber(lastFrame);
  const extension = firstFrame.split(".").pop();
  const width = firstFrame.replace(/\.[^.]+$/, "").length;
  const direction = first <= last ? 1 : -1;
  const offsets = [0, 4, 8, 13, 17, 21, 26, 30];

  return offsets.map((offset) => {
    const frame = first + offset * direction;
    return `${String(frame).padStart(width, "0")}.${extension}`;
  });
}

function rotationControlById(controlId) {
  return playerConfig.rotationControls.find((control) => control.id === controlId);
}

async function rotateByControl(controlId) {
  const control = rotationControlById(controlId);
  if (!control) return;
  if (playerState.isAnimationLocked || playerState.isRotating || playerState.currentSide !== control.from) return;
  const transition = playerConfig.rotationTransitions[control.transition];
  if (!transition) return;
  const shouldRestoreHatchOnFront = control.to === "front" && playerState.hatchResumeOnFront;

  playerState.isRotating = true;
  playerState.isAnimationLocked = true;

  try {
    if (playerState.currentSide === "front") await closeFrontFeaturesBeforeRotation();
    await preloadImage(sideStaticSourceForSide(control.to));
    playOneShot(playerConfig.audio.rotation);
    await animateImageSequence(runtime.layers.rotationAnimation, rotationSequence(transition), {
      reverse: Boolean(transition.reverse),
      onReady: () => runtime.stage.classList.add("rotating"),
      keepLastFrame: true,
      keepVisible: true,
      framesPerSecond: playerState.activeSkinMode === "blackAndWhite"
        ? playerConfig.frameRate.blackAndWhiteSparseFramesPerSecond
        : playerConfig.frameRate.defaultFramesPerSecond
    });
    playerState.currentSide = control.to;
    renderState();
    if (shouldRestoreHatchOnFront) {
      runtime.stage.classList.remove("rotating");
      runtime.layers.rotationAnimation.classList.remove("playing");
      clearCanvas(runtime.layers.rotationAnimation);
      renderState();
      runtime.layers.visualizerMask.classList.add("visible");
      runtime.layers.hatchWindow.classList.add("visible");
      syncVisualizerPlayback();
      syncBlackAndWhiteStaticOverlay();
      syncBlackAndWhiteStaticAudio();
      playOneShot(playerConfig.audio.hatchOpenOnly);
      await playHatch(true);
    }
    await nextAnimationFrame();
  } finally {
    runtime.stage.classList.remove("rotating");
    runtime.layers.rotationAnimation.classList.remove("playing");
    clearCanvas(runtime.layers.rotationAnimation);
    playerState.isRotating = false;
    playerState.isAnimationLocked = false;
    renderState();
  }
}

async function closeFrontFeaturesBeforeRotation() {
  const closeoutTasks = [];

  if (playerState.bbNetworkRingPlaying) closeoutTasks.push(retractBBNetworkRing());
  if (playerState.trackslimesExtended) closeoutTasks.push(retractTrackslimes());
  if (playerState.hatchOpen) {
    playerState.hatchResumeOnFront = true;
    playOneShot(playerConfig.audio.hatchCloseOpen);
    closeoutTasks.push(playHatch(false));
  }
  if (runtime.npVisible || runtime.npTransition) closeoutTasks.push(hideNPSkinForRotation());

  await Promise.all(closeoutTasks);
}

async function animateImageSequence(layer, sequence, options = {}) {
  const imagePaths = sequenceFramePaths(sequence, options);
  const framesPerSecond = options.framesPerSecond || playerConfig.frameRate.defaultFramesPerSecond;
  const frameDelay = (1000 / framesPerSecond) / (options.frameDelayMultiplier || 1);

  const images = options.preloadedImages || await preloadImagesInBatches(imagePaths, 8);

  return new Promise((resolve) => {
    playerState.isAnimationLocked = true;
    const startTime = performance.now();
    let lastFrameIndex = -1;

    const tick = (now) => {
      const elapsed = now - startTime;
      const frameIndex = Math.min(imagePaths.length - 1, Math.floor(elapsed / frameDelay));

      if (frameIndex !== lastFrameIndex) {
        drawFrame(layer, images[frameIndex]);
        lastFrameIndex = frameIndex;
      }

      if (frameIndex < imagePaths.length - 1) {
        requestAnimationFrame(tick);
      } else {
        if (options.onBeforeFinish) options.onBeforeFinish();
        if (!options.keepVisible) {
          layer.classList.remove("playing");
        }
        if (!options.keepLastFrame && layer instanceof HTMLCanvasElement) {
          clearCanvas(layer);
        }
        if (!options.keepLocked) playerState.isAnimationLocked = false;
        resolve();
      }
    };

    drawFrame(layer, images[0]);
    layer.classList.add("playing");
    if (options.onReady) options.onReady();
    requestAnimationFrame(tick);
  });
}

async function animateCrossfadeImageSequence(layer, fromSequence, toSequence, options = {}) {
  const fromPaths = sequenceFramePaths(fromSequence, options);
  const toPaths = sequenceFramePaths(toSequence, options);
  const frameCount = Math.min(fromPaths.length, toPaths.length);
  const framesPerSecond = options.framesPerSecond || playerConfig.frameRate.defaultFramesPerSecond;
  const frameDelay = (1000 / framesPerSecond) / (options.frameDelayMultiplier || 1);

  const [fromImages, toImages] = await Promise.all([
    preloadImagesInBatches(fromPaths.slice(0, frameCount), 8),
    preloadImagesInBatches(toPaths.slice(0, frameCount), 8)
  ]);

  return new Promise((resolve) => {
    playerState.isAnimationLocked = true;
    const startTime = performance.now();
    let lastFrameIndex = -1;

    const tick = (now) => {
      const elapsed = now - startTime;
      const frameIndex = Math.min(frameCount - 1, Math.floor(elapsed / frameDelay));

      if (frameIndex !== lastFrameIndex) {
        const progress = frameCount <= 1 ? 1 : frameIndex / (frameCount - 1);
        drawCrossfadeFrame(layer, fromImages[frameIndex], toImages[frameIndex], progress);
        lastFrameIndex = frameIndex;
      }

      if (frameIndex < frameCount - 1) {
        requestAnimationFrame(tick);
      } else {
        if (options.onBeforeFinish) options.onBeforeFinish();
        if (!options.keepVisible) {
          layer.classList.remove("playing");
        }
        if (!options.keepLastFrame && layer instanceof HTMLCanvasElement) {
          clearCanvas(layer);
        }
        if (!options.keepLocked) playerState.isAnimationLocked = false;
        resolve();
      }
    };

    drawCrossfadeFrame(layer, fromImages[0], toImages[0], 0);
    layer.classList.add("playing");
    if (options.onReady) options.onReady();
    requestAnimationFrame(tick);
  });
}

function playlist() {
  return playerConfig.playlists[playerState.activeSkinMode];
}

function playCurrentTrack() {
  const trackPath = playlist()[playerState.currentTrackIndex];
  const trackUrl = assetUrl(trackPath);
  if (!runtime.currentTrackAudio) {
    runtime.currentTrackAudio = new Audio(trackUrl);
    runtime.currentTrackAudio.preload = "auto";
    runtime.currentTrackAudio.volume = mixedVolume(audioMix.music);
    runtime.currentTrackAudio.addEventListener("ended", () => {
      stopTrackAudioAnalysis();
      playerState.currentTrackIndex = (playerState.currentTrackIndex + 1) % playlist().length;
      runtime.currentTrackAudio = null;
      if (playerState.isPlaying) playCurrentTrack();
      renderState();
    });
  }
  const trackAudio = runtime.currentTrackAudio;
  trackAudio.volume = mixedVolume(audioMix.music);
  const playPromise = trackAudio.play();
  startTrackAudioAnalysis(trackPath, trackUrl);

  Promise.resolve(playPromise)
    .catch((error) => console.warn("Could not start the current music track.", error));
}

function pauseCurrentTrack() {
  if (runtime.currentTrackAudio) runtime.currentTrackAudio.pause();
  stopTrackAudioAnalysis({ releaseBuffer: false });
}

function stopCurrentTrack() {
  if (runtime.currentTrackAudio) {
    runtime.currentTrackAudio.pause();
    runtime.currentTrackAudio.currentTime = 0;
  }
  runtime.currentTrackAudio = null;
  stopTrackAudioAnalysis();
}

function startTrackAudioAnalysis(trackPath, trackUrl) {
  stopAnalysisBufferSource();

  const precomputedEnvelope = precomputedTrackEnvelope(trackPath);
  if (precomputedEnvelope) {
    runtime.analysisLoadToken += 1;
    runtime.analysisEnvelope = precomputedEnvelope;
    runtime.analysisEnvelopeKey = trackPath;
    runtime.analysisBuffer = null;
    runtime.analysisBufferUrl = trackUrl;
    return;
  }

  runtime.analysisEnvelope = null;
  runtime.analysisEnvelopeKey = "";
  if (!primeTrackAudioAnalyser()) return;

  if (runtime.analysisBuffer && runtime.analysisBufferUrl === trackUrl) {
    return;
  }

  const loadToken = ++runtime.analysisLoadToken;
  runtime.analysisBuffer = null;
  runtime.analysisBufferUrl = trackUrl;
  fetch(trackUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.arrayBuffer();
    })
    .then((audioData) => runtime.audioContext.decodeAudioData(audioData))
    .then((decodedBuffer) => {
      if (loadToken !== runtime.analysisLoadToken || runtime.analysisBufferUrl !== trackUrl) return;
      runtime.analysisBuffer = decodedBuffer;
    })
    .catch((error) => {
      if (loadToken !== runtime.analysisLoadToken) return;
      console.warn("PBJ audio analysis could not decode the current track; music playback is unaffected.", error);
    });
}

function precomputedTrackEnvelope(trackPath) {
  const envelopeLibrary = window.SlimeBallAudioEnvelopes;
  const encodedTrack = envelopeLibrary?.tracks?.[trackPath];
  if (!encodedTrack?.values || !envelopeLibrary.framesPerSecond) return null;

  const decoded = atob(encodedTrack.values);
  const values = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    values[index] = decoded.charCodeAt(index);
  }
  return {
    duration: encodedTrack.duration,
    framesPerSecond: envelopeLibrary.framesPerSecond,
    values
  };
}

function startAnalysisBufferSource(currentTime = 0) {
  if (!runtime.analysisBuffer || !runtime.audioContext || !runtime.audioAnalyser) return;
  stopAnalysisBufferSource();
  const source = runtime.audioContext.createBufferSource();
  source.buffer = runtime.analysisBuffer;
  source.connect(runtime.audioAnalyser);
  source.addEventListener("ended", () => {
    if (runtime.analysisBufferSource === source) runtime.analysisBufferSource = null;
  });
  const duration = Math.max(0.001, runtime.analysisBuffer.duration);
  const offset = Math.max(0, Math.min(Number.isFinite(currentTime) ? currentTime : 0, duration - 0.001));
  source.start(0, offset);
  runtime.analysisBufferSource = source;
}

function stopAnalysisBufferSource() {
  if (!runtime.analysisBufferSource) return;
  const source = runtime.analysisBufferSource;
  runtime.analysisBufferSource = null;
  try {
    source.stop();
  } catch {
    // The source may already have ended naturally.
  }
  source.disconnect();
}

function stopTrackAudioAnalysis(options = {}) {
  const releaseBuffer = options.releaseBuffer !== false;
  runtime.analysisLoadToken += 1;
  stopAnalysisBufferSource();
  if (!releaseBuffer) return;
  runtime.analysisEnvelope = null;
  runtime.analysisEnvelopeKey = "";
  runtime.analysisBuffer = null;
  runtime.analysisBufferUrl = "";
}

function primeTrackAudioAnalyser() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;

  if (!runtime.audioContext) {
    runtime.audioContext = new AudioContextClass();
    runtime.audioAnalyser = runtime.audioContext.createAnalyser();
    runtime.audioAnalyser.fftSize = 2048;
    runtime.audioAnalyser.smoothingTimeConstant = 0.35;
    runtime.audioFrequencyData = new Uint8Array(runtime.audioAnalyser.frequencyBinCount);
    runtime.audioAnalysisSilenceGain = runtime.audioContext.createGain();
    runtime.audioAnalysisSilenceGain.gain.value = 0.000001;
    runtime.audioAnalyser.connect(runtime.audioAnalysisSilenceGain);
    runtime.audioAnalysisSilenceGain.connect(runtime.audioContext.destination);
  }

  if (runtime.audioContext.state === "suspended") {
    runtime.audioContext.resume().catch(() => {});
  }
  return true;
}

function playOneShot(source, volume = 1) {
  const audio = new Audio(assetUrl(source));
  audio.volume = mixedVolume(volume * audioMix.effects);
  audio.play().catch(() => {});
}

function loopAudio(source, volume = 1, options = {}) {
  if (options.overlapSeconds) return overlapLoopAudio(source, volume, options.overlapSeconds);

  const audio = createAudio(source, volume);
  audio.loop = true;
  audio.play().catch(() => {});
  return audio;
}

function stopAudio(audio) {
  if (!audio) return;
  if (typeof audio.stop === "function") {
    audio.stop();
    return;
  }
  audio.pause();
  audio.currentTime = 0;
}

function resumeAudio(audio) {
  if (!audio) return;
  if (typeof audio.resume === "function") {
    audio.resume();
    return;
  }
  if (audio.paused) audio.play().catch(() => {});
}

function createAudio(source, volume = 1) {
  const audio = new Audio(assetUrl(source));
  audio.autoplay = true;
  audio.preload = "auto";
  audio.playsInline = true;
  audio.volume = mixedVolume(volume);
  return audio;
}

function mixedVolume(volume) {
  return Math.max(0, Math.min(1, volume * audioMix.master));
}

function overlapLoopAudio(source, volume, overlapSeconds) {
  const players = [createAudio(source, volume), createAudio(source, volume)];
  const timers = new Set();
  let activeIndex = 0;
  let stopped = false;

  const clearTimers = () => {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
  };

  const scheduleNext = (audio) => {
    if (stopped) return;
    const duration = Number.isFinite(audio.duration) && audio.duration > overlapSeconds
      ? audio.duration
      : 0;
    const delay = duration > 0 ? Math.max(0.1, duration - overlapSeconds) * 1000 : 1000;
    let timer = null;
    timer = window.setTimeout(() => {
      timers.delete(timer);
      playNext();
    }, delay);
    timers.add(timer);
  };

  const playNext = () => {
    if (stopped) return;
    activeIndex = 1 - activeIndex;
    const audio = players[activeIndex];
    audio.currentTime = 0;
    audio.play().catch(() => {});
    scheduleNext(audio);
  };

  players.forEach((audio) => {
    audio.preload = "auto";
    audio.addEventListener("loadedmetadata", () => {
      if (!stopped && !timers.size && audio === players[activeIndex]) scheduleNext(audio);
    });
    audio.addEventListener("ended", () => {
      if (!stopped && audio === players[activeIndex]) playNext();
    });
  });

  players[activeIndex].play().catch(() => {});
  if (players[activeIndex].readyState >= 1) scheduleNext(players[activeIndex]);

  return {
    resume() {
      if (stopped) return;
      players[activeIndex].play().catch(() => {});
      if (!timers.size && players[activeIndex].readyState >= 1) scheduleNext(players[activeIndex]);
    },
    stop() {
      stopped = true;
      clearTimers();
      players.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    }
  };
}

function displayNameForTrack(trackPath) {
  const fileName = trackPath.split("/").pop().replace(/\.[^.]+$/, "");
  return fileName.length > 4 ? fileName.slice(4).trim() : fileName;
}

function updateNowPlayingText() {
  const title = displayNameForTrack(playlist()[playerState.currentTrackIndex]);
  if (title === runtime.nowPlayingScrollTitle) return;
  runtime.nowPlayingScrollTitle = title;
  setNowPlayingTextLayerTitle(runtime.layers.nowPlayingText, title);
  setNowPlayingTextLayerTitle(runtime.layers.nowPlayingGlow, title);
  startNowPlayingTextScroll();
}

function initializeNowPlayingTextLayer(layer) {
  const textConfig = playerConfig.npSkinRoot.trackText;
  layer.style.color = textConfig.color;
  layer.style.fontSize = `${textConfig.fontSize}px`;

  for (let index = 0; index < 2; index += 1) {
    const copy = document.createElement("span");
    copy.className = "np-track-title-copy";
    if (index > 0) copy.style.marginLeft = `${textConfig.loopGap}px`;
    layer.append(copy);
  }
}

function setNowPlayingTextLayerTitle(layer, title) {
  [...layer.children].forEach((copy) => {
    copy.textContent = title;
  });
}

function startNowPlayingTextScroll() {
  if (runtime.nowPlayingScrollFrame) cancelAnimationFrame(runtime.nowPlayingScrollFrame);

  const textConfig = playerConfig.npSkinRoot.trackText;
  const pixelsPerSecond = textConfig.scrollSpeed * 60;
  const scrollToken = ++runtime.nowPlayingScrollToken;

  const startScroll = () => {
    if (scrollToken !== runtime.nowPlayingScrollToken) return;
    const primaryCopy = runtime.layers.nowPlayingText.querySelector(".np-track-title-copy");
    const distance = Math.max(1, (primaryCopy.offsetWidth + textConfig.loopGap) * textConfig.textScale.x);
    const startTime = performance.now();

    const tick = (now) => {
      if (scrollToken !== runtime.nowPlayingScrollToken) return;
      const offset = ((now - startTime) / 1000 * pixelsPerSecond) % distance;
      const x = textConfig.startX - offset;
      applyNowPlayingTextTransform(runtime.layers.nowPlayingText, x, false);
      applyNowPlayingTextTransform(runtime.layers.nowPlayingGlow, x, true);
      runtime.nowPlayingScrollFrame = requestAnimationFrame(tick);
    };

    tick(startTime);
  };

  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => {
    runtime.nowPlayingScrollFrame = requestAnimationFrame(startScroll);
  });
}

function applyNowPlayingTextTransform(layer, x, isGlow) {
  const textConfig = playerConfig.npSkinRoot.trackText;
  const mobileYOffset = useMobileAssets ? (textConfig.mobileTranslationY || 0) : 0;
  const yOffset = mobileYOffset + (isGlow ? textConfig.glowTranslation.y : 0);
  layer.style.transform = `translate(${x}px, calc(-50% + ${yOffset}px)) scale(${textConfig.textScale.x}, ${textConfig.textScale.y})`;
}

function applyNPTrackWindowLayout() {
  const textConfig = playerConfig.npSkinRoot.trackText;
  const windowConfig = textConfig.window;
  const layer = runtime.layers.npTrackWindow;
  if (!windowConfig || !layer) return;

  const sourceSize = windowConfig.sourceSize;
  const sourceBounds = windowConfig.sourceBounds;
  const renderTranslation = windowConfig.renderTranslation || { x: 0, y: 0 };
  const displayScale = windowConfig.displayScale ?? 1;
  const width = sourceSize.width * displayScale;
  const height = sourceSize.height * displayScale;
  const sourceCenterX = sourceBounds.x + sourceBounds.width / 2;
  const sourceCenterY = sourceBounds.y + sourceBounds.height / 2;

  Object.assign(layer.style, {
    left: `${textConfig.mask.width / 2 - sourceCenterX * displayScale + renderTranslation.x}px`,
    top: `${textConfig.mask.height / 2 - sourceCenterY * displayScale + renderTranslation.y}px`,
    width: `${width}px`,
    height: `${height}px`,
    opacity: String(windowConfig.opacity ?? 1)
  });
}

function renderState() {
  const isBlackAndWhite = playerState.activeSkinMode === "blackAndWhite";
  runtime.stage.dataset.side = playerState.currentSide;
  runtime.layers.sideStatic.src = assetUrl(currentSideStaticSource());
  runtime.layers.sideStatic.classList.toggle("visible", playerState.currentSide !== "front");
  runtime.layers.frontSkin.src = assetUrl(isBlackAndWhite ? playerConfig.layers.frontSkinBlackAndWhite : playerConfig.layers.frontSkin);
  runtime.layers.hatchStatic.src = assetUrl(playerState.hatchOpen
    ? (isBlackAndWhite ? playerConfig.layers.hatchOpenBlackAndWhite : playerConfig.layers.hatchOpen)
    : (isBlackAndWhite ? playerConfig.layers.hatchClosedBlackAndWhite : playerConfig.layers.hatchClosed));
  runtime.layers.playPauseStatic.src = assetUrl(playerState.isPlaying ? playerConfig.layers.playPausePressed : playerConfig.layers.playPauseUnpressed);
  runtime.layers.npSkinImage.src = assetUrl(isBlackAndWhite ? playerConfig.layers.npSkinBlackAndWhite : playerConfig.layers.npSkin);
  syncNPSkin();
  runtime.layers.trackslimes.classList.toggle("visible", playerState.trackslimesExtended);
  runtime.layers.visualizerMask.classList.toggle("visible", playerState.hatchOpen && playerState.currentSide === "front");
  runtime.layers.hatchWindow.classList.toggle("visible", playerState.hatchOpen && playerState.currentSide === "front");
  applyVisualizerLayout();
  syncVisualizerDecorationLayers();
  syncVisualizerPlayback();
  syncBlackAndWhiteStaticOverlay();
  syncBlackAndWhiteStaticAudio();
  updateNowPlayingText();
}

function currentSideStaticSource() {
  return sideStaticSourceForSide(playerState.currentSide);
}

function sideStaticSourceForSide(sideName) {
  const side = playerConfig.layers.sides[sideName] || playerConfig.layers.sides.left;
  return side[playerState.activeSkinMode] || side.default;
}

buildPlayerShell();
