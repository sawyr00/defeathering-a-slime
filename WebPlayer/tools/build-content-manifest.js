const fs = require("fs");
const path = require("path");
const vm = require("vm");

const webPlayerRoot = path.resolve(__dirname, "..");
const contentRoot = path.join(webPlayerRoot, "Content");
const configPath = path.join(webPlayerRoot, "src", "player-config.js");
const outputPath = path.join(webPlayerRoot, "content-manifest.json");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(configPath, "utf8"), context, { filename: configPath });
const config = context.window.SlimeBallPlayerConfig;
const usedFiles = new Map();
const missingFiles = [];

function normalizedRelative(relativePath) {
  return relativePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

function resolvedContentPath(relativePath) {
  const normalized = normalizedRelative(relativePath);
  const resolved = path.resolve(contentRoot, ...normalized.split("/"));
  const contentPrefix = `${path.resolve(contentRoot)}${path.sep}`.toLowerCase();
  if (!resolved.toLowerCase().startsWith(contentPrefix)) {
    throw new Error(`Content path escaped the portable Content folder: ${relativePath}`);
  }
  return { normalized, resolved };
}

function addFile(relativePath, required = true) {
  if (!relativePath || typeof relativePath !== "string") return;
  const { normalized, resolved } = resolvedContentPath(relativePath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    if (required) missingFiles.push(normalized);
    return;
  }
  const actualRelative = path.relative(contentRoot, resolved).replaceAll("\\", "/");
  usedFiles.set(actualRelative.toLowerCase(), actualRelative);
}

function addExistingConfiguredFiles(value) {
  if (typeof value === "string") {
    if (!value.startsWith("/") && !/^[A-Za-z]:/.test(value)) addFile(value, false);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(addExistingConfiguredFiles);
    return;
  }
  if (value && typeof value === "object") Object.values(value).forEach(addExistingConfiguredFiles);
}

function frameNumber(frameName) {
  return Number(frameName.replace(/\.[^.]+$/, ""));
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

function sparseBlackAndWhiteFrames(firstFrame, lastFrame) {
  const first = frameNumber(firstFrame);
  const last = frameNumber(lastFrame);
  const extension = firstFrame.split(".").pop();
  const width = firstFrame.replace(/\.[^.]+$/, "").length;
  const direction = first <= last ? 1 : -1;
  return [0, 4, 8, 13, 17, 21, 26, 30].map((offset) => (
    `${String(first + offset * direction).padStart(width, "0")}.${extension}`
  ));
}

function addSequence(folder, frames) {
  frames.forEach((frame) => addFile(`${folder}/${frame}`));
}

addExistingConfiguredFiles(config);
addFile("fonts/Credit Block extra condensed.otf");

Object.values(config.sequences.buttons).forEach((sequence) => addSequence(sequence.folder, sequence.frames));
Object.values(config.sequences.hatch).forEach((sequence) => addSequence(sequence.folder, sequence.frames));

const features = config.sequences.features;
addSequence(features.trackslimes.folder, frameRange(features.trackslimes.firstFrame, features.trackslimes.lastFrame));
const ringFrames = frameRange(features.bbNetworkRing.firstFrame, features.bbNetworkRing.lastFrame);
addSequence(features.bbNetworkRing.folder, ringFrames);
addSequence(features.bbNetworkRing.blackAndWhiteFolder, ringFrames);
const skeletonFrames = frameRange(features.skeletonArm.firstFrame, features.skeletonArm.lastFrame);
addSequence(features.skeletonArm.folder, skeletonFrames);
addSequence("rotation/_b&w/_skeletonarmswing", skeletonFrames);

const uniqueTransitions = new Map();
Object.values(config.rotationTransitions).forEach((transition) => {
  uniqueTransitions.set(`${transition.folderName}|${transition.firstFrame}|${transition.lastFrame}`, transition);
});
uniqueTransitions.forEach((transition) => {
  addSequence(
    `rotation/${transition.folderName}`,
    frameRange(transition.firstFrame, transition.lastFrame)
  );
  addSequence(
    `rotation/_b&w/${transition.folderName}`,
    sparseBlackAndWhiteFrames(transition.firstFrame, transition.lastFrame)
  );
});

Object.values(config.sequences.visualizers).forEach((visualizer) => {
  if (visualizer.type === "livePBJ" || !visualizer.folder) return;
  for (let frame = visualizer.frameStart; frame <= visualizer.frameEnd; frame += 1) {
    const number = String(frame).padStart(visualizer.frameDigits || 4, "0");
    addFile(`${visualizer.folder}/${visualizer.framePrefix || ""}${number}.${visualizer.frameExtension || "png"}`);
  }
});

const mobileManifestPath = path.join(
  contentRoot,
  "WebPlayerOptimized",
  "Mobile",
  "mobile-assets-manifest.json"
);
if (fs.existsSync(mobileManifestPath)) {
  const mobileManifest = JSON.parse(fs.readFileSync(mobileManifestPath, "utf8"));
  mobileManifest.files.forEach((file) => addFile(file.output));
  addFile("WebPlayerOptimized/Mobile/mobile-assets-manifest.json");
}

if (missingFiles.length) {
  const uniqueMissing = [...new Set(missingFiles)].sort();
  throw new Error(`Missing ${uniqueMissing.length} required web assets:\n${uniqueMissing.join("\n")}`);
}

function allFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...allFiles(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

const existingFiles = allFiles(contentRoot);
const unusedFiles = existingFiles.filter((filePath) => {
  const relative = path.relative(contentRoot, filePath).replaceAll("\\", "/");
  return !usedFiles.has(relative.toLowerCase());
});
const usedBytes = [...usedFiles.values()].reduce((sum, relative) => (
  sum + fs.statSync(path.join(contentRoot, ...relative.split("/"))).size
), 0);
const unusedBytes = unusedFiles.reduce((sum, filePath) => sum + fs.statSync(filePath).size, 0);

const manifest = {
  version: 1,
  contentRoot: "./Content",
  files: [...usedFiles.values()].sort((a, b) => a.localeCompare(b))
};
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({
  manifest: outputPath,
  usedFiles: manifest.files.length,
  usedBytes,
  unusedFiles: unusedFiles.length,
  unusedBytes
}, null, 2));
