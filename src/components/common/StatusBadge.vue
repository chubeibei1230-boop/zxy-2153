<script setup lang="ts">
import { computed } from 'vue';
import { Circle, PlayCircle, CheckCircle, AlertCircle } from 'lucide-vue-next';
import type { NodeStatus } from '@/types';
import { STATUS_LABELS } from '@/types';

const props = defineProps<{
  status: NodeStatus;
  size?: 'sm' | 'md';
}>();

const sizeClass = computed(() => props.size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1');

const statusConfig = computed(() => {
  const configs: Record<NodeStatus, { bg: string; text: string; icon: any }> = {
    not_started: { bg: 'bg-slate-100', text: 'text-slate-700', icon: Circle },
    in_preparation: { bg: 'bg-sky-100', text: 'text-sky-700', icon: PlayCircle },
    completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
    delayed: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertCircle },
  };
  return configs[props.status];
});
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full font-medium transition-colors"
    :class="[sizeClass, statusConfig.bg, statusConfig.text]"
  >
    <component :is="statusConfig.icon" :size="props.size === 'sm' ? 12 : 14" />
    {{ STATUS_LABELS[status] }}
  </span>
</template>
