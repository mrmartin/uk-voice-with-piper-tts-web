<script setup>
import { ref, nextTick, onMounted } from 'vue';

const props = defineProps({
  text: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  playing: { type: Boolean, default: false },
});

const textEl = ref(null);
const scrollDistance = ref(0);
const ready = ref(false);

onMounted(async () => {
  await nextTick();
  if (textEl.value) {
    scrollDistance.value = textEl.value.offsetWidth;
  }
  ready.value = true;
});
</script>

<template>
  <div
    class="overflow-hidden rounded-xl bg-gradient-to-r from-indigo-50 via-white to-indigo-50 dark:from-gray-800 dark:via-gray-800/80 dark:to-gray-800 border border-indigo-200/60 dark:border-purple-800/40"
    style="-webkit-mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent); mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent)"
  >
    <div
      class="whitespace-nowrap text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-100 py-5 select-none"
      :class="{ 'scroll-animate': ready }"
      :style="{
        paddingLeft: '50%',
        paddingRight: '50%',
        '--scroll-dist': `-${scrollDistance}px`,
        '--scroll-dur': `${duration}s`,
        animationPlayState: playing ? 'running' : 'paused',
      }"
    >
      <span ref="textEl">{{ text }}</span>
    </div>
  </div>
</template>

<style scoped>
.scroll-animate {
  animation: scroll-text var(--scroll-dur) linear forwards;
}

@keyframes scroll-text {
  from { transform: translateX(0); }
  to { transform: translateX(var(--scroll-dist)); }
}
</style>
