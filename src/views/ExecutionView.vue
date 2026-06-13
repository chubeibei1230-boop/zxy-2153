<script setup lang="ts">
import { computed } from 'vue';
import { 
  Clock, User, Package, StickyNote, CheckCircle, PlayCircle, 
  AlertCircle, Circle, ChevronRight
} from 'lucide-vue-next';
import type { TimelineStore } from '@/composables/useTimeline';
import type { FilterStore } from '@/composables/useFilters';
import type { NodeStatus, TimelineNode } from '@/types';
import { STATUS_LABELS } from '@/types';
import { getTimeDisplay, parseTimeToMinutes } from '@/utils/timeUtils';

const props = defineProps<{
  timelineStore: TimelineStore;
  filterStore: FilterStore;
}>();

const pendingNodes = computed(() => {
  return [...props.timelineStore.timelineNodes.value]
    .filter(n => n.status === 'not_started' || n.status === 'delayed')
    .sort((a, b) => {
      if (a.status === 'delayed' && b.status !== 'delayed') return -1;
      if (b.status === 'delayed' && a.status !== 'delayed') return 1;
      return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    });
});

const completedCount = computed(() => 
  props.timelineStore.timelineNodes.value.filter(n => n.status === 'completed').length
);

const inProgressCount = computed(() => 
  props.timelineStore.timelineNodes.value.filter(n => n.status === 'in_preparation').length
);

const totalCount = computed(() => props.timelineStore.timelineNodes.value.length);

const currentTime = computed(() => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
});

function getNextStatus(current: NodeStatus): NodeStatus {
  const flow: NodeStatus[] = ['not_started', 'in_preparation', 'completed'];
  const currentIndex = flow.indexOf(current);
  if (currentIndex < flow.length - 1) {
    return flow[currentIndex + 1];
  }
  return current;
}

function advanceStatus(node: TimelineNode) {
  const next = getNextStatus(node.status);
  props.timelineStore.updateNodeStatus(node.id, next);
}

function markAsDelayed(node: TimelineNode) {
  props.timelineStore.updateNodeStatus(node.id, 'delayed');
}

function resetStatus(node: TimelineNode) {
  props.timelineStore.updateNodeStatus(node.id, 'not_started');
}

const statusIcons: Record<NodeStatus, any> = {
  not_started: Circle,
  in_preparation: PlayCircle,
  completed: CheckCircle,
  delayed: AlertCircle,
};

const statusColors: Record<NodeStatus, string> = {
  not_started: 'text-slate-500',
  in_preparation: 'text-sky-500',
  completed: 'text-emerald-500',
  delayed: 'text-amber-500',
};
</script>

<template>
  <div class="min-h-[calc(100vh-65px)] bg-slate-50">
    <div class="max-w-4xl mx-auto px-6 py-8">
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-slate-800 mb-2">现场执行清单</h1>
        <p class="text-slate-500">专注于当前需要处理的事项，按时间顺序执行</p>
      </div>

      <div class="grid grid-cols-4 gap-4 mb-8">
        <div class="card p-4">
          <div class="text-3xl font-bold text-slate-800">{{ totalCount }}</div>
          <div class="text-sm text-slate-500">总事项数</div>
        </div>
        <div class="card p-4">
          <div class="text-3xl font-bold text-emerald-600">{{ completedCount }}</div>
          <div class="text-sm text-slate-500">已完成</div>
        </div>
        <div class="card p-4">
          <div class="text-3xl font-bold text-sky-600">{{ inProgressCount }}</div>
          <div class="text-sm text-slate-500">进行中</div>
        </div>
        <div class="card p-4">
          <div class="text-3xl font-bold text-amber-600">{{ pendingNodes.length }}</div>
          <div class="text-sm text-slate-500">待处理</div>
        </div>
      </div>

      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-800">待办事项</h2>
        <div class="text-sm text-slate-500 flex items-center gap-1.5">
          <Clock :size="14" />
          当前时间 {{ currentTime }}
        </div>
      </div>

      <div v-if="pendingNodes.length === 0" class="card p-12 text-center">
        <div class="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle :size="32" class="text-emerald-600" />
        </div>
        <h3 class="text-lg font-semibold text-slate-800 mb-2">所有事项已完成！</h3>
        <p class="text-slate-500">太棒了，今天的接待工作已经全部完成</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="(node, index) in pendingNodes"
          :key="node.id"
          class="card overflow-hidden transition-all duration-200 hover:shadow-md"
          :class="node.status === 'delayed' ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-slate-300'"
        >
          <div class="p-5">
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center"
                  :class="node.status === 'delayed' ? 'bg-amber-100' : 'bg-slate-100'"
                >
                  <span class="text-lg font-bold" :class="node.status === 'delayed' ? 'text-amber-600' : 'text-slate-500'">
                    {{ index + 1 }}
                  </span>
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <h3 class="text-lg font-semibold text-slate-900">{{ node.name }}</h3>
                      <span
                        class="tag text-xs"
                        :class="node.status === 'delayed' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'"
                      >
                        <component :is="statusIcons[node.status]" :size="12" :class="statusColors[node.status]" />
                        {{ STATUS_LABELS[node.status] }}
                      </span>
                    </div>
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                      <span class="flex items-center gap-1.5">
                        <Clock :size="14" class="text-slate-400" />
                        {{ getTimeDisplay(node.startTime, node.durationMinutes) }}
                      </span>
                      <span v-if="node.personInCharge" class="flex items-center gap-1.5">
                        <User :size="14" class="text-slate-400" />
                        {{ node.personInCharge }}
                      </span>
                      <span v-if="node.requiredItems.length > 0" class="flex items-center gap-1.5">
                        <Package :size="14" class="text-slate-400" />
                        {{ node.requiredItems.join('、') }}
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      v-if="node.status !== 'completed'"
                      class="btn gap-2 px-4 py-2 text-white"
                      :class="[
                        node.status === 'delayed' 
                          ? 'bg-amber-600 hover:bg-amber-700' 
                          : 'bg-primary-600 hover:bg-primary-700'
                      ]"
                      @click="advanceStatus(node)"
                    >
                      {{ node.status === 'not_started' ? '开始准备' : '标记完成' }}
                      <ChevronRight :size="16" />
                    </button>
                  </div>
                </div>

                <div v-if="node.notes" class="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                  <StickyNote :size="14" class="text-slate-400 mt-0.5 flex-shrink-0" />
                  <p class="text-sm text-slate-600">{{ node.notes }}</p>
                </div>

                <div class="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  <span class="text-xs text-slate-400">快速操作：</span>
                  <button
                    v-if="node.status === 'not_started'"
                    class="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2 py-1 rounded transition-colors"
                    @click="markAsDelayed(node)"
                  >
                    标记需延后
                  </button>
                  <button
                    v-if="node.status === 'delayed'"
                    class="text-xs text-slate-600 hover:text-slate-700 hover:bg-slate-50 px-2 py-1 rounded transition-colors"
                    @click="resetStatus(node)"
                  >
                    恢复为未开始
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
