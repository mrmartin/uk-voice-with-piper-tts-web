<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';

const props = defineProps({
  audio: {
    type: Blob,
    required: true
  },
  active: {
    type: Boolean,
    required: true
  },
  playing: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['start', 'pause', 'end']);

const audioRef = ref(null);

const url = computed(() => {
  return URL.createObjectURL(props.audio);
});

const handlePlay = () => {
  emit('start', audioRef.value?.duration || 0);
};

const handlePause = () => {
  if (audioRef.value?.ended) return;
  emit('pause');
};

const handleEnded = () => {
  emit('end');
};

watch([() => props.active, () => props.playing], ([newActive, newPlaying]) => {
  if (!audioRef.value) return;
  if (!newActive) return;

  if (newPlaying) {
    if (audioRef.value.ended) {
      audioRef.value.currentTime = 0;
    }
    audioRef.value.play();
  } else {
    audioRef.value.pause();
  }
});

onMounted(() => {
  if (!props.audio) return;
  if (!audioRef.value) return;

  if (props.active) {
    audioRef.value.play();
  } else {
    audioRef.value.pause();
    audioRef.value.currentTime = 0;
  }
})

onUnmounted(() => {
  URL.revokeObjectURL(url.value);
});
</script>

<template>
  <audio
    ref="audioRef"
    :src="url"
    @play="handlePlay"
    @pause="handlePause"
    @ended="handleEnded"
  ></audio>
</template>
