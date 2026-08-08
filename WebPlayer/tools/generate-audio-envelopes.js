const fs = require("fs");
const path = require("path");
const vm = require("vm");

const webPlayerRoot = path.resolve(__dirname, "..");
const contentRoot = path.join(webPlayerRoot, "Content");
const configPath = path.join(webPlayerRoot, "src", "player-config.js");
const outputPath = path.join(webPlayerRoot, "src", "audio-envelopes.js");
const envelopeFramesPerSecond = 30;
const sourceFrameStride = 4;

const configContext = { window: {} };
vm.runInNewContext(fs.readFileSync(configPath, "utf8"), configContext, { filename: configPath });
const config = configContext.window.SlimeBallPlayerConfig;
const trackPaths = [...new Set(Object.values(config.playlists).flat())];

function readWav(filePath) {
  const data = fs.readFileSync(filePath);
  if (data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error(`Unsupported WAV container: ${filePath}`);
  }

  let format = null;
  let audioDataOffset = 0;
  let audioDataLength = 0;
  for (let offset = 12; offset + 8 <= data.length;) {
    const chunkId = data.toString("ascii", offset, offset + 4);
    const chunkLength = data.readUInt32LE(offset + 4);
    const chunkDataOffset = offset + 8;
    if (chunkId === "fmt ") {
      format = {
        encoding: data.readUInt16LE(chunkDataOffset),
        channels: data.readUInt16LE(chunkDataOffset + 2),
        sampleRate: data.readUInt32LE(chunkDataOffset + 4),
        blockAlign: data.readUInt16LE(chunkDataOffset + 12),
        bitsPerSample: data.readUInt16LE(chunkDataOffset + 14)
      };
    } else if (chunkId === "data") {
      audioDataOffset = chunkDataOffset;
      audioDataLength = Math.min(chunkLength, data.length - chunkDataOffset);
    }
    offset = chunkDataOffset + chunkLength + (chunkLength % 2);
  }

  if (!format || !audioDataOffset || !audioDataLength) {
    throw new Error(`Incomplete WAV file: ${filePath}`);
  }
  return { data, format, audioDataOffset, audioDataLength };
}

function sampleAt(wav, byteOffset) {
  const { data, format } = wav;
  if (format.encoding === 3 && format.bitsPerSample === 32) return data.readFloatLE(byteOffset);
  if (format.encoding !== 1) throw new Error(`Unsupported WAV encoding ${format.encoding}`);
  if (format.bitsPerSample === 16) return data.readInt16LE(byteOffset) / 32768;
  if (format.bitsPerSample === 24) return data.readIntLE(byteOffset, 3) / 8388608;
  if (format.bitsPerSample === 32) return data.readInt32LE(byteOffset) / 2147483648;
  throw new Error(`Unsupported PCM depth ${format.bitsPerSample}`);
}

function buildEnvelope(trackPath) {
  const filePath = path.join(contentRoot, ...trackPath.split("/"));
  const wav = readWav(filePath);
  const { format, audioDataOffset, audioDataLength } = wav;
  const bytesPerSample = format.bitsPerSample / 8;
  const sourceFrameCount = Math.floor(audioDataLength / format.blockAlign);
  const envelopeFrameCount = Math.ceil(sourceFrameCount / format.sampleRate * envelopeFramesPerSecond);
  const values = Buffer.alloc(envelopeFrameCount);

  for (let envelopeIndex = 0; envelopeIndex < envelopeFrameCount; envelopeIndex += 1) {
    const firstSourceFrame = Math.floor(envelopeIndex * format.sampleRate / envelopeFramesPerSecond);
    const lastSourceFrame = Math.min(
      sourceFrameCount,
      Math.floor((envelopeIndex + 1) * format.sampleRate / envelopeFramesPerSecond)
    );
    let sumSquares = 0;
    let sampleCount = 0;
    for (let sourceFrame = firstSourceFrame; sourceFrame < lastSourceFrame; sourceFrame += sourceFrameStride) {
      const frameOffset = audioDataOffset + sourceFrame * format.blockAlign;
      for (let channel = 0; channel < format.channels; channel += 1) {
        const sample = sampleAt(wav, frameOffset + channel * bytesPerSample);
        sumSquares += sample * sample;
        sampleCount += 1;
      }
    }
    const rms = sampleCount ? Math.sqrt(sumSquares / sampleCount) : 0;
    values[envelopeIndex] = Math.round(Math.max(0, Math.min(1, rms)) * 255);
  }

  return {
    duration: sourceFrameCount / format.sampleRate,
    values: values.toString("base64")
  };
}

const tracks = {};
for (const trackPath of trackPaths) {
  process.stdout.write(`Analyzing ${trackPath}\n`);
  tracks[trackPath] = buildEnvelope(trackPath);
}

const output = [
  "// Generated from the player WAV files by tools/generate-audio-envelopes.js.",
  "// PBJ reads this data without routing or modifying audible music playback.",
  `window.SlimeBallAudioEnvelopes = ${JSON.stringify({
    version: 1,
    framesPerSecond: envelopeFramesPerSecond,
    tracks
  })};`,
  ""
].join("\n");

fs.writeFileSync(outputPath, output);
process.stdout.write(`Wrote ${outputPath}\n`);
