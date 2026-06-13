<script setup lang="ts">
import { Check, X, Play, AlertCircle, Clock } from 'lucide-vue-next';
import type { NodeStatus } from '@/types';

defineProps<{
  selectedCount: number;
}>();

const emit = defineEmits<{
  (e: 'batch-update', status: NodeStatus): void;
  (e: 'clear-selection'): void;
}>();

const statusActions: { status: NodeStatus; label: string; icon: any; class: string }[] = [
  { status: 'not_started', label: '标记未开始', icon: Clock, class: 'bg-slate-600 hover:bg-slate-700' },
  { status: 'in_preparation', label: '标记准备中', icon: Play, class: 'bg-sky-600 hover:bg-sky-700' },
  { status: 'completed', label: '标记已完成', icon: Check, class: 'bg-emerald-600 hover:bg-emerald-700' },
  { status: 'delayed', label: '标记需延后', icon: AlertCircle, class: 'bg-amber-600 hover:bg-amber-700' },
];
</script>

<template>
  <div
    class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-slate-200 px-4 py-3 z-50 animate-slide-in"
  >
    <div class="flex items-center gap-4">
      <div class="text-sm text-slate-700">
        已选择 <span class="font-semibold text-primary-600">{{ selectedCount }}</span> 项
      </div>
      
      <div class="h-5 w-px bg-slate-200" />
      
      <div class="flex items-center gap-2">
        <button
          v-for="action in statusActions"
          :key="action.status"
          class="btn gap-1.5 text-white text-xs px-3 py-1.5"
          :class="action.class"
          @click="emit('batch-update', action.status)"
        >
          <component :is="action.icon" :size="14" />
          {{ action.label }}
        </button>
      </div>

      <div class="h-5 w-px bg-slate-200" />

      <button
        class="btn btn-ghost gap-1 text-sm"
        @click="emit('clear-selection')"
      >
        <X :size="14" />
        取消
      </button>
    </div>
  </div>
</template>
