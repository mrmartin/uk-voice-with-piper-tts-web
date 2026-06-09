<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import {
  DownloadIcon,
  PauseIcon,
  PlayIcon,
  CopyIcon,
  CheckIcon,
  GithubIcon,
  ExternalLinkIcon
} from 'lucide-vue-next';
import TextStatistics from './components/TextStatistics.vue';
import VoiceSelector from './components/VoiceSelector.vue';
import SpeedControl from './components/SpeedControl.vue';
import ThemeToggle from './components/ThemeToggle.vue';
import AudioChunk from './components/AudioChunk.vue';
import ScrollingText from './components/ScrollingText.vue';

// State variables
const text = ref(
    "Hello there! Welcome to the UK voice demo. This uses British English voices from Piper TTS, running entirely in your browser."
);
const lastGeneration = ref(null);
const isPlaying = ref(false);
const currentChunkIndex = ref(-1);
const speed = ref(1);
const copied = ref(false);
const status = ref("loading");
const error = ref(null);
const worker = ref(null);
const modelReady = ref(false);
const voices = ref([]);
const selectedVoice = ref('cori-high');
const chunks = ref([]);
const result = ref(null);
const currentChunkDuration = ref(0);

const processed = computed(() => {
  return lastGeneration.value &&
      lastGeneration.value.text === text.value &&
      lastGeneration.value.speed === speed.value &&
      lastGeneration.value.voice === selectedVoice.value;
});

const setSpeed = (newSpeed) => {
  speed.value = newSpeed;
};

const handleVoiceChange = (voiceId) => {
  if (voiceId === selectedVoice.value) return;
  selectedVoice.value = voiceId;
  isPlaying.value = false;
  chunks.value = [];
  result.value = null;
  lastGeneration.value = null;
  currentChunkIndex.value = -1;
  worker.value?.postMessage({ type: 'switchVoice', voice: voiceId });
};

const restartWorker = () => {
  if (worker.value) {
    worker.value.terminate();
  }
  
  status.value = "loading";
  modelReady.value = false;
  chunks.value = [];
  result.value = null;
  lastGeneration.value = null; // Reset so button shows "Generate"
  isPlaying.value = false;
  currentChunkIndex.value = -1;
  
  worker.value = new Worker(new URL("./workers/tts-worker.js", import.meta.url), {
    type: "module",
  });
  
  worker.value.addEventListener("message", onMessageReceived);
  worker.value.addEventListener("error", onErrorReceived);
  
  // Send init message
  worker.value.postMessage({ type: 'init' });
};

const handleChunkStart = (index, duration) => {
  currentChunkIndex.value = index;
  currentChunkDuration.value = duration;
};

const setIsPlaying = (playing) => {
  isPlaying.value = playing;
};

const handleChunkEnd = () => {
  if (status.value !== "generating" && currentChunkIndex.value === chunks.value.length - 1) {
    isPlaying.value = false;
    currentChunkIndex.value = -1;
  } else {
    currentChunkIndex.value = currentChunkIndex.value + 1;
  }
};

const handlePlayPause = () => {
  if (!isPlaying.value && status.value === "ready" && !processed.value) {
    status.value = "generating";
    chunks.value = [];
    currentChunkIndex.value = 0;
    const params = {
      text: text.value,
      speed: speed.value,
      voice: selectedVoice.value
    };
    lastGeneration.value = params;
    worker.value?.postMessage(params);
  }
  if (currentChunkIndex.value === -1) {
    currentChunkIndex.value = 0;
  }
  isPlaying.value = !isPlaying.value;
};

const downloadAudio = () => {
  if (!result.value) return;
  const url = URL.createObjectURL(result.value);
  const link = document.createElement("a");
  link.href = url;
  link.download = "audio.wav";
  link.click();
  URL.revokeObjectURL(url);
}

const handleCopy = async () => {
  await navigator.clipboard.writeText(text.value);
  copied.value = true;
  setTimeout(() => { copied.value = false }, 2000);
}

// Worker message handlers
const onMessageReceived = ({ data }) => {
  switch (data.status) {
    case "ready":
      status.value = "ready";
      modelReady.value = true;
      if (data.voices) voices.value = data.voices;
      if (data.voice) selectedVoice.value = data.voice;
      break;
    case "loading":
      status.value = "loading";
      modelReady.value = false;
      break;
    case "error":
      status.value = "error";
      error.value = data.data;
      break;
    case "stream":
      chunks.value = [...chunks.value, data.chunk];
      break;
    case "complete":
      status.value = "ready";
      result.value = data.audio;
      break;
    case "preview":
      // Play preview audio immediately
      if (data.audio) {
        const audioUrl = URL.createObjectURL(data.audio);
        const audio = new Audio(audioUrl);
        audio.play().then(() => {
          // Clean up URL after playing
          setTimeout(() => URL.revokeObjectURL(audioUrl), 1000);
        }).catch(err => console.error('Error playing preview:', err));
      }
      break;
  }
};

const onErrorReceived = (e) => {
  console.error("Worker error:", e);
  error.value = e.message;
};

// Worker setup
onMounted(() => {
  restartWorker();
});

// Cleanup
onUnmounted(() => {
  if (worker.value) {
    worker.value.terminate();
  }
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-800 transition-colors duration-300">
    <!-- Header -->
    <header class="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50">
      <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="text-3xl">🇬🇧</div>
          <div>
            <h1 class="text-xl font-bold bg-gradient-to-r text-blue-800 dark:text-blue-500">
              UK Voice Demo
            </h1>
            <p class="text-sm text-muted-foreground hidden sm:block">British English &middot; Piper TTS in your browser</p>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <a
            href="https://github.com/mrmartin/uk-voice-with-piper-tts-web"
            target="_blank"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <GithubIcon class="w-4 h-4" />
            <span class="hidden sm:inline">GitHub</span>
            <ExternalLinkIcon class="w-3 h-3" />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 pt-8 pb-4 max-w-4xl">
      <!-- Main Card -->
      <div class="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
        <div class="p-6 pb-0 space-y-6">
          <!-- Scrolling text display -->
          <ScrollingText
            v-if="currentChunkIndex >= 0 && chunks.length > 0"
            :chunks="chunks"
            :current-index="currentChunkIndex"
            :duration="currentChunkDuration"
            :playing="isPlaying"
          />

          <!-- Text Input Section -->
          <div class="space-y-4">
            <div class="relative">
              <textarea
                v-model="text"
                placeholder="Type or paste your text here..."
                class="w-full min-h-[180px] text-lg leading-relaxed resize-y p-4 pt-8 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-0 transition-colors"
                :class="modelReady ? '' : 'text-muted-foreground'"
              ></textarea>
              <button
                class="absolute top-1 right-3 h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                @click="handleCopy"
                :title="copied ? 'Copied!' : 'Copy text'"
              >
                <CheckIcon v-if="copied" class="h-4 w-4 text-green-500" />
                <CopyIcon v-else class="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div class="flex justify-end">
              <TextStatistics :text="text" />
            </div>
          </div>

          <!-- Controls Section -->
          <div v-if="voices.length > 0" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex items-center">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2 whitespace-nowrap">
                  Voice:
                </label>
                <VoiceSelector
                  :voices="voices"
                  :selected-voice="selectedVoice"
                  :disabled="status === 'loading'"
                  @voice-change="handleVoiceChange"
                />
              </div>
              <div class="flex items-center">
                <SpeedControl
                  :speed="speed"
                  @speed-change="setSpeed"
                />
              </div>
            </div>
            <div v-if="status === 'loading'" class="flex items-center gap-2 text-muted-foreground text-sm">
              <div class="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
              <span>Loading voice model...</span>
            </div>
          </div>

          <div v-else-if="error" class="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {{ error }}
          </div>
          <div v-else class="flex items-center gap-2 text-muted-foreground">
            <div class="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
            <span>Loading model...</span>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-3">
            <button
              class="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="{
                'bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 shadow-lg shadow-orange-500/25': isPlaying,
                'bg-blue-800 shadow-lg': !isPlaying
              }"
              @click="handlePlayPause"
              :disabled="(status === 'ready' && !isPlaying && !text) || (status !== 'ready' && chunks.length === 0)"
            >
              <PauseIcon v-if="isPlaying" class="w-5 h-5" />
              <PlayIcon v-else class="w-5 h-5" />
              <span v-if="isPlaying">Pause</span>
              <span v-else>{{ processed || status === 'generating' ? 'Play' : 'Generate' }}</span>
            </button>

            <button
              class="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="downloadAudio"
              :disabled="!result || status !== 'ready'"
            >
              <DownloadIcon class="w-4 h-4" />
              Download Audio
            </button>
          </div>

          <!-- Hidden Audio Chunks -->
          <div class="w-0 h-0 hidden">
            <AudioChunk
              v-if="chunks.length > 0"
              v-for="(chunk, index) in chunks"
              :key="index"
              :audio="chunk.audio"
              :active="currentChunkIndex === index"
              :playing="isPlaying"
              @start="(duration) => handleChunkStart(index, duration)"
              @pause="() => { if (currentChunkIndex === index) setIsPlaying(false) }"
              @end="handleChunkEnd"
            />
          </div>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 py-4 mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          Voices from <a href="https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_GB" target="_blank" class="text-blue-500 hover:text-blue-700 transition-colors">rhasspy/piper-voices</a>
          &middot; Powered by <a href="https://github.com/rhasspy/piper" target="_blank" class="text-blue-500 hover:text-blue-700 transition-colors">Piper TTS</a>
        </p>
      </div>
    </main>
  </div>
</template>
