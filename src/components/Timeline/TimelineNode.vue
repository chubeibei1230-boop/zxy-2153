<script setup lang="ts">
import { computed, ref } from 'vue';
import { 
  GripVertical, ChevronDown, ChevronUp, AlertTriangle, 
  AlertCircle, User, Package, Clock, MoveRight 
} from 'lucide-vue-next';
import type { TimelineNode as TimelineNodeType, RiskAlert } from '@/types';
import StatusBadge from '@/components/common/StatusBadge.vue';
import NodeEditor from './NodeEditor.vue';
import { useTimelineStore } from '@/composables/useTimeline';
import { getTimeDisplay } from '@/utils/timeUtils';

const props = defineProps<{
  node: TimelineNodeType;
  risks: RiskAlert[];
  selected: boolean;
  hasOrderMismatch: boolean;
  index: number;
}>();

const emit = defineEmits<{
  (e: 'toggle-select'): void;
  (e: 'scroll-to-me'): void;
}>();

const store = useTimelineStore();
const isDragging = ref(false);

const isExpanded = computed(() => store.isNodeExpanded(props.node.id));
const nodeRisks = computed(() => 
  props.risks.filter(r => r.relatedNodeIds.includes(props.node.id))
);
const hasRisk = computed(() => nodeRisks.value.length > 0);
const riskSeverity = computed(() => {
  if (nodeRisks.value.some(r => r.severity === 'error')) return 'error';
  if (nodeRisks.value.some(r => r.severity === 'warning')) return 'warning';
  return null;
});

const statusBorderColor = computed(() => {
  const colors: Record<string, string> = {
    not_started: 'border-l-slate-400',
    in_preparation: 'border-l-sky-500',
    completed: 'border-l-emerald-500',
    delayed: 'border-l-amber-500',
  };
  return colors[props.node.status];
});

const timeDisplay = computed(() => 
  getTimeDisplay(props.node.startTime, props.node.durationMinutes)
);

function handleToggleExpand(e: MouseEvent) {
  e.stopPropagation();
  store.toggleNodeExpanded(props.node.id);
}

function handleDelete() {
  store.deleteNode(props.node.id);
}

function handleShiftTime(delta: number) {
  store.shiftTimeFromNode(props.node.id, delta);
}

function onDragStart() {
  isDragging.value = true;
}

function onDragEnd() {
  isDragging.value = false;
}
</script>

<template>
  <div
    class="card relative overflow-hidden transition-all duration-200"
    :class="[
      statusBorderColor,
      'border-l-4',
      isDragging ? 'opacity-50' : '',
      selected ? 'ring-2 ring-primary-500 ring-offset-2' : '',
      hasOrderMismatch && hasRisk ? 'bg-amber-50/50' : '',
    ]"
    @click="emit('toggle-select')"
  >
    <div class="flex items-start gap-3 p-4">
      <div class="flex flex-col items-center gap-1">
        <div
          class="drag-handle p-1 -ml-1 text-slate-400 hover:text-slate-600 transition-colors rounded"
          @mousedown.stop
          @dragstart="onDragStart"
          @dragend="onDragEnd"
        >
          <GripVertical :size="18" />
        </div>
        <div class="w-px h-full bg-slate-200" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-2">
              <span class="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                #{{ String(index + 1).padStart(2, '0') }}
              </span>
              <h3 class="text-base font-semibold text-slate-900 truncate">
                {{ node.name }}
              </h3>
              <StatusBadge :status="node.status" size="sm" />
            </div>

            <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
              <span class="flex items-center gap-1.5">
                <Clock :size="14" class="text-slate-400" />
                {{ timeDisplay }}
                <span class="text-slate-400">({{ node.durationMinutes }}分钟)</span>
              </span>
              
              <span v-if="node.personInCharge" class="flex items-center gap-1.5">
                <User :size="14" class="text-slate-400" />
                {{ node.personInCharge }}
              </span>

              <span v-if="node.requiredItems.length > 0" class="flex items-center gap-1.5">
                <Package :size="14" class="text-slate-400" />
                {{ node.requiredItems.length }}项物品
              </span>
            </div>

            <div
              v-if="hasOrderMismatch && hasRisk && !isExpanded"
              class="mt-2 px-3 py-1.5 bg-amber-100 border border-amber-200 rounded-md text-sm text-amber-800 flex items-center gap-1.5"
            >
              <AlertTriangle :size="14" />
              时间顺序与排列顺序不一致，建议调整
            </div>
          </div>

          <div class="flex items-center gap-2">
            <div class="flex flex-col gap-1" @click.stop>
              <button
                class="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="将此节点及之后时间延后5分钟"
                @click="handleShiftTime(5)"
              >
                <MoveRight :size="14" />
              </button>
              <button
                class="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors rotate-180"
                title="将此节点及之后时间提前5分钟"
                @click="handleShiftTime(-5)"
              >
                <MoveRight :size="14" />
              </button>
            </div>

            <div v-if="hasRisk" class="relative" @click.stop>
              <div
                class="p-1.5 rounded-full cursor-pointer transition-colors"
                :class="[
                  riskSeverity === 'error' 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                ]"
              >
                <AlertCircle :size="16" />
              </div>
              <div class="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-bold"
                :class="riskSeverity === 'error' ? 'bg-red-500' : 'bg-amber-500'"
              >
                {{ nodeRisks.length }}
              </div>
            </div>

            <button
              class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              @click="handleToggleExpand"
            >
              <ChevronDown v-if="!isExpanded" :size="18" />
              <ChevronUp v-else :size="18" />
            </button>
          </div>
        </div>

        <div
          v-if="node.notes && !isExpanded"
          class="mt-2 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md"
        >
          {{ node.notes }}
        </div>
      </div>
    </div>

    <NodeEditor
      v-if="isExpanded"
      :node="node"
      @close="store.toggleNodeExpanded(node.id)"
      @delete="handleDelete"
    />
  </div>
</template>
