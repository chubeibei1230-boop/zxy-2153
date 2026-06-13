<script setup lang="ts">
import { computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import {
  ChevronRight,
  Clock,
  User,
  Package,
  Circle,
  PlayCircle,
  CheckCircle,
  AlertCircle,
  ListTodo,
  Filter,
  FileText,
} from 'lucide-vue-next';
import type { TimelineStore } from '@/composables/useTimeline';
import type { FilterStore } from '@/composables/useFilters';
import type { NodeStatus, TimelineNode } from '@/types';
import { STATUS_LABELS } from '@/types';
import { useRiskDetection } from '@/composables/useRiskDetection';
import { getTimeDisplay } from '@/utils/timeUtils';

import CommandOverview from '@/components/Overview/CommandOverview.vue';
import FilterBar from '@/components/Filters/FilterBar.vue';

const props = defineProps<{
  timelineStore: TimelineStore;
  filterStore: FilterStore;
}>();

const router = useRouter();

const riskDetection = useRiskDetection(
  () => props.timelineStore.timelineNodes.value,
  () => props.timelineStore.lectureInfo
);

const risks = computed(() => riskDetection.risks.value);

const filteredNodes = computed(() => {
  const sorted = [...props.timelineStore.timelineNodes.value].sort((a, b) => a.sortOrder - b.sortOrder);
  return props.filterStore.applyFilters(sorted, risks.value);
});

const hasActiveFilters = computed(() => props.filterStore.hasActiveFilters.value);

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

const statusBgColors: Record<NodeStatus, string> = {
  not_started: 'bg-slate-100',
  in_preparation: 'bg-sky-100',
  completed: 'bg-emerald-100',
  delayed: 'bg-amber-100',
};

function cycleStatus(node: TimelineNode) {
  const flow: NodeStatus[] = ['not_started', 'in_preparation', 'completed'];
  const currentIdx = flow.indexOf(node.status);
  if (currentIdx >= 0 && currentIdx < flow.length - 1) {
    props.timelineStore.updateNodeStatus(node.id, flow[currentIdx + 1]);
  }
}

function getNodeRiskSeverity(nodeId: string): 'error' | 'warning' | null {
  const nodeRisks = risks.value.filter(r => r.relatedNodeIds.includes(nodeId));
  if (nodeRisks.some(r => r.severity === 'error')) return 'error';
  if (nodeRisks.some(r => r.severity === 'warning')) return 'warning';
  return null;
}

function getNodeRiskCount(nodeId: string): number {
  return risks.value.filter(r => r.relatedNodeIds.includes(nodeId)).length;
}

function goToTimeline() {
  router.push('/');
}

function goToExecution() {
  router.push('/execution');
}

function handleLocateNode(nodeId: string) {
  const nodeExists = filteredNodes.value.some(n => n.id === nodeId);
  if (!nodeExists) {
    props.filterStore.clearFilters();
  }
  nextTick(() => {
    setTimeout(() => {
      const element = document.querySelector(`[data-node-id="${nodeId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-primary-400', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-primary-400', 'ring-offset-2');
        }, 2500);
      }
    }, 50);
  });
}
</script>

<template>
  <div class="min-h-[calc(100vh-65px)] bg-slate-50">
    <CommandOverview
      :timeline-store="timelineStore"
      :filter-store="filterStore"
      :risks="risks"
      @locate-node="handleLocateNode"
      @go-summary="router.push('/summary')"
    />

    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <ListTodo :size="18" class="text-slate-600" />
          <h2 class="text-lg font-semibold text-slate-800">全部事项</h2>
          <span class="text-sm text-slate-400">
            共 {{ filteredNodes.length }} 项
            <span v-if="hasActiveFilters" class="text-primary-500">(已筛选)</span>
          </span>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <button
            class="btn btn-secondary gap-1.5 text-sm"
            @click="goToTimeline"
          >
            <Filter :size="14" />
            流程编排
          </button>
          <button
            class="btn btn-secondary gap-1.5 text-sm"
            @click="goToExecution"
          >
            <ListTodo :size="14" />
            现场执行
          </button>
          <button
            class="btn gap-1.5 text-sm bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-sm hover:shadow"
            @click="router.push('/summary')"
          >
            <FileText :size="14" />
            生成交接摘要
          </button>
        </div>
      </div>

      <FilterBar
        :filter-store="filterStore"
        :all-persons="timelineStore.allPersons.value"
      />

      <div class="mt-4 space-y-3">
        <div v-if="filteredNodes.length === 0" class="card p-12 text-center">
          <div class="text-slate-400 mb-2">
            <ListTodo :size="32" class="mx-auto" />
          </div>
          <div class="text-sm text-slate-500">
            {{ hasActiveFilters ? '没有符合筛选条件的事项' : '暂无接待事项' }}
          </div>
        </div>

        <div
          v-for="node in filteredNodes"
          :key="node.id"
          :data-node-id="node.id"
          class="card overflow-hidden transition-all duration-200 hover:shadow-md"
          :class="{
            'border-l-4 border-l-emerald-500': node.status === 'completed',
            'border-l-4 border-l-sky-500': node.status === 'in_preparation',
            'border-l-4 border-l-amber-500': node.status === 'delayed',
            'border-l-4 border-l-slate-300': node.status === 'not_started',
          }"
        >
          <div class="p-4">
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0">
                <button
                  class="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  :class="[
                    statusBgColors[node.status],
                    node.status !== 'completed' ? 'hover:ring-2 hover:ring-offset-2 hover:ring-primary-300 cursor-pointer' : 'cursor-default'
                  ]"
                  @click="cycleStatus(node)"
                  :title="node.status === 'not_started' ? '标记为准备中' : node.status === 'in_preparation' ? '标记为已完成' : '已完成'"
                >
                  <component :is="statusIcons[node.status]" :size="18" :class="statusColors[node.status]" />
                </button>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-4 mb-2">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <h3
                        class="text-base font-medium truncate"
                        :class="node.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'"
                      >
                        {{ node.name }}
                      </h3>
                      <span
                        class="tag text-[10px] flex-shrink-0"
                        :class="[
                          statusBgColors[node.status],
                          statusColors[node.status]
                        ]"
                      >
                        {{ STATUS_LABELS[node.status] }}
                      </span>
                      <div v-if="getNodeRiskCount(node.id) > 0" class="flex-shrink-0">
                        <div
                          class="w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center font-bold"
                          :class="getNodeRiskSeverity(node.id) === 'error' ? 'bg-red-500' : 'bg-amber-500'"
                        >
                          {{ getNodeRiskCount(node.id) }}
                        </div>
                      </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
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

                  <button
                    class="flex-shrink-0 p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                    @click="goToTimeline"
                    title="查看详情"
                  >
                    <ChevronRight :size="18" />
                  </button>
                </div>

                <div v-if="node.notes" class="text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mt-2">
                  {{ node.notes }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
