<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  chunks: { type: Array, required: true },
  currentIndex: { type: Number, required: true },
  duration: { type: Number, default: 0 },
  playing: { type: Boolean, default: false },
});

const viewportEl = ref(null);
const trackEl = ref(null);
const currEl = ref(null);

let animation = null;

const SEP = ' · ';

const prevText = computed(() =>
  props.currentIndex > 0 ? props.chunks[props.currentIndex - 1].text : ''
);

const currText = computed(() => {
  const i = props.currentIndex;
  return i >= 0 && i < props.chunks.length ? props.chunks[i].text : '';
});

const nextText = computed(() => {
  const i = props.currentIndex + 1;
  return i < props.chunks.length ? props.chunks[i].text : '';
});

async function startScroll() {
  if (animation) {
    const ct = getComputedStyle(trackEl.value).transform;
    animation.cancel();
    animation = null;
    if (trackEl.value) trackEl.value.style.transform = ct;
  }

  await nextTick();

  if (!viewportEl.value || !currEl.value || !trackEl.value) return;
  if (!props.duration || props.duration <= 0) return;

  const pad = viewportEl.value.offsetWidth * 0.5;
  const currLeft = currEl.value.offsetLeft;
  const currWidth = currEl.value.offsetWidth;

  trackEl.value.style.transform = '';

  animation = trackEl.value.animate(
    [
      { transform: `translateX(${-(currLeft - pad)}px)` },
      { transform: `translateX(${-(currLeft - pad + currWidth)}px)` },
    ],
    { duration: props.duration * 1000, easing: 'linear', fill: 'forwards' }
  );

  if (!props.playing) animation.pause();
}

watch(() => props.currentIndex, startScroll);
watch(() => props.duration, (d) => { if (d > 0 && !animation) startScroll(); });
watch(() => props.playing, (p) => { if (animation) p ? animation.play() : animation.pause(); });

onMounted(startScroll);
onUnmounted(() => { if (animation) animation.cancel(); });
</script>

<template>
  <div
    ref="viewportEl"
    class="overflow-hidden rounded-xl bg-gradient-to-r from-indigo-50 via-white to-indigo-50 dark:from-gray-800 dark:via-gray-900/80 dark:to-gray-800 border border-indigo-200/60 dark:border-purple-800/40"
    style="-webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent)"
  >
    <div
      ref="trackEl"
      class="relative whitespace-nowrap text-2xl sm:text-3xl font-semibold py-5 select-none"
      style="padding-left: 50%; padding-right: 50%"
    >
      <span
        v-if="prevText"
        class="text-gray-300 dark:text-gray-600"
      >{{ prevText }}{{ SEP }}</span>
      <span
        ref="currEl"
        class="text-gray-800 dark:text-gray-100"
      >{{ currText }}</span>
      <span
        v-if="nextText"
        class="text-gray-300 dark:text-gray-600"
      >{{ SEP }}{{ nextText }}</span>
    </div>
  </div>
</template>
