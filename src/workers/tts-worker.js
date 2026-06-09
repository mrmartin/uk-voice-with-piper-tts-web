import { PiperTTS, TextSplitterStream } from "../lib/piper-tts.js";

let tts = null;
let currentVoice = null;

const HF_BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB';

const VOICES = {
  'alan-medium': {
    name: 'Alan (Male)',
    model: `${HF_BASE}/alan/medium/en_GB-alan-medium.onnx`,
    config: `${HF_BASE}/alan/medium/en_GB-alan-medium.onnx.json`,
  },
  'cori-high': {
    name: 'Cori (Female)',
    model: `${HF_BASE}/cori/high/en_GB-cori-high.onnx`,
    config: `${HF_BASE}/cori/high/en_GB-cori-high.onnx.json`,
  },
};

async function loadVoice(voiceId) {
  const voice = VOICES[voiceId];
  if (!voice) throw new Error(`Unknown voice: ${voiceId}`);

  tts = await PiperTTS.from_pretrained(voice.model, voice.config);
  currentVoice = voiceId;
}

async function initializeModel() {
  try {
    const voiceList = Object.entries(VOICES).map(([id, v]) => ({ id, name: v.name }));
    await loadVoice('alan-medium');
    self.postMessage({ status: "ready", voices: voiceList, voice: 'alan-medium' });
  } catch (e) {
    console.error("Error loading model:", e);
    self.postMessage({ status: "error", data: e.message });
  }
}

async function handlePreview(text, speed) {
  try {
    const streamer = new TextSplitterStream();
    streamer.push(text);
    streamer.close();

    const lengthScale = 1.0 / (speed || 1.0);

    const stream = tts.stream(streamer, { lengthScale });

    for await (const { audio } of stream) {
      const audioBlob = audio.toBlob();
      self.postMessage({ status: "preview", audio: audioBlob });
      break;
    }
  } catch (error) {
    console.error('Error generating preview:', error);
  }
}

self.addEventListener("message", async (e) => {
  const { type, text, speed, voice } = e.data;

  if (type === 'init') {
    await initializeModel();
    return;
  }

  if (type === 'switchVoice') {
    if (voice === currentVoice) return;
    try {
      self.postMessage({ status: "loading" });
      await loadVoice(voice);
      self.postMessage({ status: "ready", voice });
    } catch (err) {
      console.error("Error switching voice:", err);
      self.postMessage({ status: "error", data: err.message });
    }
    return;
  }

  if (!tts) {
    self.postMessage({ status: "error", data: "Model not initialized" });
    return;
  }

  if (type === 'preview') {
    await handlePreview(text, speed);
    return;
  }

  const streamer = new TextSplitterStream();
  streamer.push(text);
  streamer.close();

  const lengthScale = 1.0 / (speed || 1.0);

  const stream = tts.stream(streamer, { lengthScale });
  const chunks = [];

  try {
    for await (const { text, audio } of stream) {
      self.postMessage({
        status: "stream",
        chunk: {
          audio: audio.toBlob(),
          text,
          duration: audio.audio.length / audio.sampling_rate,
        },
      });
      chunks.push(audio);
    }
  } catch (error) {
    console.error("Error during streaming:", error);
    self.postMessage({ status: "error", data: error.message });
    return;
  }

  // Merge chunks
  let audio;
  if (chunks.length > 0) {
    try {
      const originalSamplingRate = chunks[0].sampling_rate;
      const length = chunks.reduce((sum, chunk) => sum + chunk.audio.length, 0);
      let waveform = new Float32Array(length);
      let offset = 0;
      for (const { audio } of chunks) {
        waveform.set(audio, offset);
        offset += audio.length;
      }

      // Normalize peaks & trim silence
      normalizePeak(waveform, 0.9);
      waveform = trimSilence(waveform, 0.002, Math.floor(originalSamplingRate * 0.02)); // 20ms padding

      // Create a new merged RawAudio with the original sample rate
      // @ts-expect-error - So that we don't need to import RawAudio
      audio = new chunks[0].constructor(waveform, originalSamplingRate);
    } catch (error) {
      console.error("Error processing audio chunks:", error);
      self.postMessage({ status: "error", data: error.message });
      return;
    }
  }

  self.postMessage({ status: "complete", audio: audio?.toBlob() });
});

function normalizePeak(f32, target = 0.9) {
  if (!f32?.length) return;
  let max = 1e-9;
  for (let i = 0; i < f32.length; i++) max = Math.max(max, Math.abs(f32[i]));
  const g = Math.min(4, target / max);
  if (g < 1) {
    for (let i = 0; i < f32.length; i++) f32[i] *= g;
  }
}

function trimSilence(f32, thresh = 0.002, minSamples = 480) {
  let s = 0,
      e = f32.length - 1;
  while (s < e && Math.abs(f32[s]) < thresh) s++;
  while (e > s && Math.abs(f32[e]) < thresh) e--;
  s = Math.max(0, s - minSamples);
  e = Math.min(f32.length, e + minSamples);
  return f32.slice(s, e);
}

// Note: Initialization now handled via init message from UI
