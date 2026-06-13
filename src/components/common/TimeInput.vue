<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Clock } from 'lucide-vue-next';
import { isValidTimeFormat } from '@/utils/timeUtils';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'blur'): void;
}>();

const localValue = ref(props.modelValue);
const hasError = ref(false);

watch(() => props.modelValue, (val) => {
  localValue.value = val;
  hasError.value = false;
});

const inputClasses = computed(() => {
  return [
    'w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all',
    hasError.value
      ? 'border-red-400 focus:ring-red-500 focus:border-transparent'
      : 'border-slate-300 focus:ring-primary-500 focus:border-transparent'
  ];
});

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  localValue.value = target.value;
  hasError.value = localValue.value !== '' && !isValidTimeFormat(localValue.value);
}

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (isValidTimeFormat(target.value) || target.value === '') {
    emit('update:modelValue', target.value);
    hasError.value = false;
  } else {
    hasError.value = true;
  }
}

function handleBlur() {
  if (hasError.value) {
    localValue.value = props.modelValue;
    hasError.value = false;
  }
  emit('blur');
}
</script>

<template>
  <div class="relative">
    <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
      <Clock :size="16" />
    </div>
    <input
      type="time"
      :value="localValue"
      :placeholder="placeholder || 'HH:mm'"
      :class="inputClasses"
      class="pl-10"
      @input="handleInput"
      @change="handleChange"
      @blur="handleBlur"
    />
  </div>
</template>
