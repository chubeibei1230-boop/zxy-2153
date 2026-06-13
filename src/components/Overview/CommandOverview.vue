<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  Calendar,
  Clock,
  User,
  Package,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  Circle,
  Timer,
  Users,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Gauge,
  Zap,
  Flag,
  RefreshCw
} from 'lucide-vue-next';
import type { TimelineStore } from '@/composables/useTimeline';
import type { FilterStore } from '@/composables/useFilters';
import type { NodeStatus, TimelineNode, RiskAlert, RiskType } from '@/types';
import { STATUS_LABELS, RISK_TYPE_LABELS } from '@/types';
import { getTimeDisplay, parseTimeToMinutes, addMinutesToTime } from '@/utils/timeUtils';

const props = defineProps<{
  timelineStore: TimelineStore;
  filterStore: FilterStore;
  risks: RiskAlert[];
}>();

const emit = defineEmits<{
  (e: 'locate-node', nodeId: string): void;
  (e: 'toggle-visibility'): void;
}>();

const expandedSections = ref<Set<string>>(new Set(['pending', 'delayed', 'risks']));
const currentTimeStr = ref('');
let timeInterval: number | null = null;

function toggleSection(section: string) {
  if (expandedSections.value.has(section)) {
    expandedSections.value.delete(section);
  } else {
    expandedSections.value.add(section);
  }
}

function updateCurrentTime() {
  const now = new Date();
  currentTimeStr.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

onMounted(() => {
  updateCurrentTime();
  timeInterval = window.setInterval(updateCurrentTime, 60000);
});

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval);
  }
});

const lectureInfo = computed(() => props.timelineStore.lectureInfo);
const allNodes = computed(() => props.timelineStore.timelineNodes.value);

const statusCounts = computed(() => {
  const counts: Record<NodeStatus, number> = {
    not_started: 0,
    in_preparation: 0,
    completed: 0,
    delayed: 0,
  };
  allNodes.value.forEach(node => {
    counts[node.status]++;
  });
  return counts;
});

const totalNodes = computed(() => allNodes.value.length);

const progressPercent = computed(() => {
  if (totalNodes.value === 0) return 0;
  return Math.round((statusCounts.value.completed / totalNodes.value) * 100);
});

const deadlineTime = computed(() => {
  return addMinutesToTime(lectureInfo.value.startTime, -lectureInfo.value.bufferMinutes);
});

const filteredNodes = computed(() => {
  return props.filterStore.applyFilters(allNodes.value, props.risks);
});

const hasActiveFilters = computed(() => props.filterStore.hasActiveFilters.value);

const pendingNodes = computed(() => {
  return [...filteredNodes.value]
    .filter(n => n.status === 'not_started' || n.status === 'in_preparation')
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime))
    .slice(0, 5);
});

const delayedNodes = computed(() => {
  return [...filteredNodes.value]
    .filter(n => n.status === 'delayed')
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
});

const riskIcons: Record<RiskType, any> = {
  time_overlap: Clock,
  person_overload: Users,
  items_missing: Package,
  end_time_exceed: Timer,
  order_mismatch: ArrowRightLeft,
};

const errorCount = computed(() => props.risks.filter(r => r.severity === 'error').length);
const warningCount = computed(() => props.risks.filter(r => r.severity === 'warning').length);

const displayedRisks = computed(() => {
  return [...props.risks]
    .sort((a, b) => {
      if (a.severity === 'error' && b.severity !== 'error') return -1;
      if (b.severity === 'error' && a.severity !== 'error') return 1;
      return 0;
    })
    .slice(0, 5);
});

const statusIcons: Record<NodeStatus, any> = {
  not_started: Circle,
  in_preparation: PlayCircle,
  completed: CheckCircle,
  delayed: AlertCircle,
};

const statusDotColors: Record<NodeStatus, string> = {
  not_started: 'bg-slate-500',
  in_preparation: 'bg-sky-500',
  completed: 'bg-emerald-500',
  delayed: 'bg-amber-500',
};

function getNodeRisks(nodeId: string): RiskAlert[] {
  return props.risks.filter(r => r.relatedNodeIds.includes(nodeId));
}

function getNodeRiskSeverity(nodeId: string): 'error' | 'warning' | null {
  const nodeRisks = getNodeRisks(nodeId);
  if (nodeRisks.some(r => r.severity === 'error')) return 'error';
  if (nodeRisks.some(r => r.severity === 'warning')) return 'warning';
  return null;
}

function handleLocateNode(nodeId: string) {
  emit('locate-node', nodeId);
}

function cycleStatus(node: TimelineNode) {
  const flow: NodeStatus[] = ['not_started', 'in_preparation', 'completed'];
  const currentIdx = flow.indexOf(node.status);
  if (currentIdx >= 0 && currentIdx < flow.length - 1) {
    props.timelineStore.updateNodeStatus(node.id, flow[currentIdx + 1]);
  }
}

function markAsDelayed(node: TimelineNode) {
  props.timelineStore.updateNodeStatus(node.id, 'delayed');
}

function resetStatus(node: TimelineNode) {
  props.timelineStore.updateNodeStatus(node.id, 'not_started');
}

const overallStatus = computed(() => {
  if (errorCount.value > 0) return { label: '需立即关注', color: 'text-red-600', bg: 'bg-red-100', dot: 'bg-red-500' };
  if (warningCount.value > 0 || statusCounts.value.delayed > 0) return { label: '有风险项', color: 'text-amber-600', bg: 'bg-amber-100', dot: 'bg-amber-500' };
  if (progressPercent.value === 100) return { label: '全部完成', color: 'text-emerald-600', bg: 'bg-emerald-100', dot: 'bg-emerald-500' };
  return { label: '正常推进中', color: 'text-sky-600', bg: 'bg-sky-100', dot: 'bg-sky-500' };
});

const personWorkload = computed(() => {
  const workload = new Map<string, { total: number; completed: number; delayed: number }>();
  allNodes.value.forEach(node => {
    if (!node.personInCharge) return;
    if (!workload.has(node.personInCharge)) {
      workload.set(node.personInCharge, { total: 0, completed: 0, delayed: 0 });
    }
    const data = workload.get(node.personInCharge)!;
    data.total++;
    if (node.status === 'completed') data.completed++;
    if (node.status === 'delayed') data.delayed++;
  });
  return Array.from(workload.entries())
    .map(([name, data]) => ({
      name,
      ...data,
      progress: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total);
});

const itemsSummary = computed(() => {
  const allItems = new Set<string>();
  const preparedItems = new Set<string>();
  allNodes.value.forEach(node => {
    node.requiredItems.forEach(item => {
      allItems.add(item);
      if (node.status === 'completed') {
        preparedItems.add(item);
      }
    });
  });
  return {
    total: allItems.size,
    prepared: preparedItems.size,
    percent: allItems.size > 0 ? Math.round((preparedItems.size / allItems.size) * 100) : 0
  };
});
</script>

<template>
  <div class="bg-white border-b border-slate-200">
    <div class="flex items-center justify-between px-4 sm:px-6 py-3 bg-gradient-to-r from-primary-700 to-primary-600 text-white">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <LayoutDashboard :size="18" />
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold truncate">现场指挥总览</h2>
          <p class="text-xs text-white/70 hidden sm:block">会务负责人实时监控面板</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span
          class="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5"
          :class="[overallStatus.bg, overallStatus.color]"
        >
          <span class="w-1.5 h-1.5 rounded-full animate-pulse-soft" :class="overallStatus.dot" />
          {{ overallStatus.label }}
        </span>
        <button
          class="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors lg:hidden"
          @click="emit('toggle-visibility')"
        >
          <ChevronDown :size="18" />
        </button>
      </div>
    </div>

    <div class="p-4 sm:p-6 space-y-5">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div class="col-span-2 md:col-span-1 card p-3 sm:p-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar :size="20" class="text-primary-600" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs text-slate-500 mb-0.5">当前讲座</div>
              <div class="text-sm font-semibold text-slate-800 truncate">{{ lectureInfo.name }}</div>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-500">
                <span class="flex items-center gap-1">
                  <Clock :size="12" />
                  {{ lectureInfo.startTime }}
                </span>
                <span class="flex items-center gap-1">
                  <Timer :size="12" />
                  截止 {{ deadlineTime }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="card p-3 sm:p-4">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Gauge :size="16" class="text-emerald-600" />
              </div>
              <span class="text-xs text-slate-500">完成进度</span>
            </div>
            <span class="text-2xl font-bold text-emerald-600">{{ progressPercent }}%</span>
          </div>
          <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
          <div class="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>{{ statusCounts.completed }} / {{ totalNodes }} 已完成</span>
            <span class="flex items-center gap-1">
              <Clock :size="12" />
              {{ currentTimeStr }}
            </span>
          </div>
        </div>

        <div class="card p-3 sm:p-4">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
              <Users :size="16" class="text-sky-600" />
            </div>
            <span class="text-xs text-slate-500">负责人进度</span>
          </div>
          <div class="space-y-1.5">
            <div v-for="person in personWorkload.slice(0, 2)" :key="person.name" class="flex items-center gap-2">
              <span class="text-xs text-slate-600 truncate w-16 flex-shrink-0">{{ person.name }}</span>
              <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="person.delayed > 0 ? 'bg-amber-500' : 'bg-sky-500'"
                  :style="{ width: `${person.progress}%` }"
                />
              </div>
              <span class="text-[10px] text-slate-500 w-8 text-right flex-shrink-0">{{ person.progress }}%</span>
            </div>
            <div v-if="personWorkload.length === 0" class="text-xs text-slate-400 text-center py-1">
              暂无负责人
            </div>
          </div>
        </div>

        <div class="card p-3 sm:p-4">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
              <Package :size="16" class="text-violet-600" />
            </div>
            <span class="text-xs text-slate-500">物品准备</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-2xl font-bold text-violet-600">{{ itemsSummary.prepared }}/{{ itemsSummary.total }}</span>
            <div class="text-right">
              <div class="text-xs text-slate-500">项物品</div>
              <div class="text-xs font-medium text-violet-600">{{ itemsSummary.percent }}%</div>
            </div>
          </div>
          <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
            <div
              class="h-full bg-gradient-to-r from-violet-400 to-violet-600 rounded-full transition-all duration-500"
              :style="{ width: `${itemsSummary.percent}%` }"
            />
          </div>
        </div>
      </div>

      <div class="card overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 bg-slate-50">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
              <Flag :size="15" class="text-slate-600" />
            </div>
            <span class="text-sm font-medium text-slate-700">各状态事项数量</span>
            <span v-if="hasActiveFilters" class="text-[10px] px-1.5 py-0.5 bg-primary-100 text-primary-600 rounded">已筛选</span>
          </div>
          <span class="text-xs text-slate-400">点击可快速筛选</span>
        </div>
        <div class="p-4">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              v-for="status in (['not_started', 'in_preparation', 'completed', 'delayed'] as NodeStatus[])"
              :key="status"
              class="p-3 rounded-lg border transition-all text-left hover:shadow-sm"
              :class="[
                filterStore.filters.statuses.includes(status)
                  ? 'border-primary-400 bg-primary-50 ring-2 ring-primary-200'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              ]"
              @click="filterStore.toggleStatus(status)"
            >
              <div class="flex items-center gap-2 mb-2">
                <span class="w-2.5 h-2.5 rounded-full" :class="statusDotColors[status]" />
                <span class="text-xs text-slate-500">{{ STATUS_LABELS[status] }}</span>
              </div>
              <div class="text-2xl font-bold" :class="{
                'text-slate-600': status === 'not_started',
                'text-sky-600': status === 'in_preparation',
                'text-emerald-600': status === 'completed',
                'text-amber-600': status === 'delayed',
              }">
                {{ statusCounts[status] }}
              </div>
              <div class="text-[11px] text-slate-400 mt-1">
                {{ totalNodes > 0 ? Math.round((statusCounts[status] / totalNodes) * 100) : 0 }}%
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="card overflow-hidden">
          <button
            class="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            @click="toggleSection('pending')"
          >
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 bg-sky-100 rounded-lg flex items-center justify-center">
                <Zap :size="15" class="text-sky-600" />
              </div>
              <span class="text-sm font-medium text-slate-700">最近待处理</span>
              <span class="text-xs text-slate-400">({{ pendingNodes.length }})</span>
            </div>
            <ChevronDown v-if="!expandedSections.has('pending')" :size="16" class="text-slate-400" />
            <ChevronUp v-else :size="16" class="text-slate-400" />
          </button>

          <div v-show="expandedSections.has('pending')" class="divide-y divide-slate-100">
            <div v-if="pendingNodes.length === 0" class="p-6 text-center text-sm text-slate-400">
              暂无待处理事项
            </div>
            <div
              v-for="node in pendingNodes"
              :key="node.id"
              class="p-3 hover:bg-slate-50 transition-colors group"
              :class="getNodeRiskSeverity(node.id) === 'error' ? 'bg-red-50/50' : getNodeRiskSeverity(node.id) === 'warning' ? 'bg-amber-50/50' : ''"
            >
              <div class="flex items-start gap-3">
                <button
                  class="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
                  :class="{
                    'border-slate-300 hover:border-sky-500 hover:bg-sky-50': node.status === 'not_started',
                    'border-sky-500 bg-sky-50 hover:bg-emerald-50 hover:border-emerald-500': node.status === 'in_preparation',
                  }"
                  @click.stop="cycleStatus(node)"
                  :title="node.status === 'not_started' ? '标记为准备中' : '标记为已完成'"
                >
                  <component
                    v-if="node.status === 'in_preparation'"
                    :is="statusIcons[node.status]"
                    :size="12"
                    class="text-sky-500"
                  />
                </button>

                <div class="flex-1 min-w-0 cursor-pointer" @click="handleLocateNode(node.id)">
                  <div class="flex items-center gap-2 mb-1">
                    <h4 class="text-sm font-medium text-slate-800 truncate group-hover:text-primary-600 transition-colors">
                      {{ node.name }}
                    </h4>
                    <span
                      class="tag text-[10px] flex-shrink-0"
                      :class="{
                        'bg-slate-100 text-slate-600': node.status === 'not_started',
                        'bg-sky-100 text-sky-600': node.status === 'in_preparation',
                      }"
                    >
                      <component :is="statusIcons[node.status]" :size="10" />
                      {{ STATUS_LABELS[node.status] }}
                    </span>
                    <div v-if="getNodeRisks(node.id).length > 0" class="flex-shrink-0">
                      <div
                        class="w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center font-bold"
                        :class="getNodeRiskSeverity(node.id) === 'error' ? 'bg-red-500' : 'bg-amber-500'"
                      >
                        {{ getNodeRisks(node.id).length }}
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span class="flex items-center gap-1">
                      <Clock :size="11" />
                      {{ getTimeDisplay(node.startTime, node.durationMinutes) }}
                    </span>
                    <span v-if="node.personInCharge" class="flex items-center gap-1">
                      <User :size="11" />
                      {{ node.personInCharge }}
                    </span>
                    <span v-if="node.requiredItems.length > 0" class="flex items-center gap-1">
                      <Package :size="11" />
                      {{ node.requiredItems.length }}项
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    v-if="node.status !== 'delayed'"
                    class="p-1 text-amber-500 hover:bg-amber-100 rounded transition-colors"
                    title="标记需延后"
                    @click.stop="markAsDelayed(node)"
                  >
                    <AlertCircle :size="14" />
                  </button>
                  <button
                    class="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="定位到事项"
                    @click="handleLocateNode(node.id)"
                  >
                    <ChevronRight :size="14" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card overflow-hidden">
          <button
            class="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            @click="toggleSection('delayed')"
          >
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                <AlertCircle :size="15" class="text-amber-600" />
              </div>
              <span class="text-sm font-medium text-slate-700">需延后事项</span>
              <span
                v-if="delayedNodes.length > 0"
                class="text-[10px] px-1.5 py-0.5 bg-amber-500 text-white rounded-full"
              >
                {{ delayedNodes.length }}
              </span>
            </div>
            <ChevronDown v-if="!expandedSections.has('delayed')" :size="16" class="text-slate-400" />
            <ChevronUp v-else :size="16" class="text-slate-400" />
          </button>

          <div v-show="expandedSections.has('delayed')" class="divide-y divide-slate-100">
            <div v-if="delayedNodes.length === 0" class="p-6 text-center">
              <div class="w-10 h-10 mx-auto mb-2 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle :size="18" class="text-emerald-500" />
              </div>
              <div class="text-sm text-slate-500">暂无需延后事项</div>
            </div>
            <div
              v-for="node in delayedNodes"
              :key="node.id"
              class="p-3 bg-amber-50/50 hover:bg-amber-50 transition-colors group border-l-4 border-amber-400"
            >
              <div class="flex items-start gap-3">
                <div class="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertCircle :size="12" class="text-amber-500" />
                </div>

                <div class="flex-1 min-w-0 cursor-pointer" @click="handleLocateNode(node.id)">
                  <div class="flex items-center gap-2 mb-1">
                    <h4 class="text-sm font-medium text-slate-800 truncate group-hover:text-primary-600 transition-colors">
                      {{ node.name }}
                    </h4>
                    <div v-if="getNodeRisks(node.id).length > 0" class="flex-shrink-0">
                      <div
                        class="w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center font-bold"
                        :class="getNodeRiskSeverity(node.id) === 'error' ? 'bg-red-500' : 'bg-amber-500'"
                      >
                        {{ getNodeRisks(node.id).length }}
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span class="flex items-center gap-1">
                      <Clock :size="11" />
                      {{ getTimeDisplay(node.startTime, node.durationMinutes) }}
                    </span>
                    <span v-if="node.personInCharge" class="flex items-center gap-1">
                      <User :size="11" />
                      {{ node.personInCharge }}
                    </span>
                    <span v-if="node.requiredItems.length > 0" class="flex items-center gap-1">
                      <Package :size="11" />
                      {{ node.requiredItems.join('、') }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-1 flex-shrink-0">
                  <button
                    class="px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                    title="恢复为未开始"
                    @click.stop="resetStatus(node)"
                  >
                    <RefreshCw :size="12" class="inline" />
                    恢复
                  </button>
                  <button
                    class="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="定位到事项"
                    @click="handleLocateNode(node.id)"
                  >
                    <ChevronRight :size="14" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card overflow-hidden">
          <button
            class="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            @click="toggleSection('risks')"
          >
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle :size="15" class="text-red-600" />
              </div>
              <span class="text-sm font-medium text-slate-700">风险提醒</span>
              <span v-if="risks.length > 0" class="flex items-center gap-1">
                <span v-if="errorCount > 0" class="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded-full">
                  {{ errorCount }} 严重
                </span>
                <span v-if="warningCount > 0" class="text-[10px] px-1.5 py-0.5 bg-amber-500 text-white rounded-full">
                  {{ warningCount }} 警告
                </span>
              </span>
            </div>
            <ChevronDown v-if="!expandedSections.has('risks')" :size="16" class="text-slate-400" />
            <ChevronUp v-else :size="16" class="text-slate-400" />
          </button>

          <div v-show="expandedSections.has('risks')" class="divide-y divide-slate-100">
            <div v-if="displayedRisks.length === 0" class="p-6 text-center">
              <div class="w-10 h-10 mx-auto mb-2 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle :size="18" class="text-emerald-500" />
              </div>
              <div class="text-sm text-slate-500">暂无风险提醒</div>
            </div>
            <div
              v-for="risk in displayedRisks"
              :key="risk.id"
              class="p-3 hover:bg-slate-50 transition-colors group"
              :class="risk.severity === 'error' ? 'bg-red-50/50' : 'bg-amber-50/50'"
            >
              <div class="flex items-start gap-3">
                <div
                  class="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center"
                  :class="risk.severity === 'error' ? 'bg-red-100' : 'bg-amber-100'"
                >
                  <component
                    :is="riskIcons[risk.type]"
                    :size="12"
                    :class="risk.severity === 'error' ? 'text-red-500' : 'text-amber-500'"
                  />
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span
                      class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      :class="risk.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'"
                    >
                      {{ RISK_TYPE_LABELS[risk.type] }}
                    </span>
                  </div>
                  <p class="text-sm text-slate-700 leading-relaxed">{{ risk.message }}</p>
                </div>

                <button
                  v-if="risk.relatedNodeIds.length > 0"
                  class="flex-shrink-0 p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  title="定位到相关事项"
                  @click="handleLocateNode(risk.relatedNodeIds[0])"
                >
                  <ChevronRight :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
