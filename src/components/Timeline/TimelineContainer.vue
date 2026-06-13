<script setup lang="ts">
import { ref, computed } from 'vue';
import draggable from 'vuedraggable';
import type { TimelineNode as TimelineNodeType } from '@/types';
import TimelineNode from './TimelineNode.vue';
import { useTimelineStore } from '@/composables/useTimeline';
import { useRiskDetection } from '@/composables/useRiskDetection';
import type { FilterStore } from '@/composables/useFilters';
import { parseTimeToMinutes } from '@/utils/timeUtils';

const props = defineProps<{
  filterStore: FilterStore;
}>();

const store = useTimelineStore();

const selectedIds = ref<Set<string>>(new Set());
const riskDetection = useRiskDetection(
  store.timelineNodes.value,
  store.lectureInfo,
  (id) => store.timelineNodes.value.find(n => n.id === id)
);

const filteredNodes = computed(() => {
  const sorted = [...store.timelineNodes.value].sort((a, b) => a.sortOrder - b.sortOrder);
  return props.filterStore.applyFilters(sorted, riskDetection.risks.value);
});

const sortedNodesForDrag = computed({
  get: () => filteredNodes.value,
  set: (value: TimelineNodeType[]) => {
    const fullList = [...store.timelineNodes.value].sort((a, b) => a.sortOrder - b.sortOrder);
    const filteredIds = new Set(filteredNodes.value.map(n => n.id));
    
    let sortIndex = 0;
    const newOrder: TimelineNodeType[] = [];
    
    fullList.forEach(node => {
      if (filteredIds.has(node.id)) {
        const filteredNode = value.find(n => n.id === node.id);
        if (filteredNode) {
          newOrder.push({ ...filteredNode, sortOrder: sortIndex++ });
        }
      } else {
        newOrder.push({ ...node, sortOrder: sortIndex++ });
      }
    });
    
    store.updateSortOrder(newOrder);
  }
});

function toggleSelect(id: string) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id);
  } else {
    selectedIds.value.add(id);
  }
}

function isSelected(id: string) {
  return selectedIds.value.has(id);
}

function clearSelection() {
  selectedIds.value.clear();
}

function selectAll() {
  filteredNodes.value.forEach(node => {
    selectedIds.value.add(node.id);
  });
}

const selectedNodes = computed(() => 
  filteredNodes.value.filter(n => selectedIds.value.has(n.id))
);

const hasSelection = computed(() => selectedIds.value.size > 0);

const timeSlots = computed(() => {
  if (filteredNodes.value.length === 0) return [];
  
  const times = new Set<number>();
  filteredNodes.value.forEach(node => {
    times.add(parseTimeToMinutes(node.startTime));
    times.add(parseTimeToMinutes(node.startTime) + node.durationMinutes);
  });
  
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const slots: number[] = [];
  
  for (let t = Math.floor(minTime / 60) * 60; t <= Math.ceil(maxTime / 60) * 60; t += 30) {
    slots.push(t);
  }
  
  return slots;
});

defineExpose({
  selectedIds,
  selectedNodes,
  hasSelection,
  clearSelection,
  selectAll,
  risks: riskDetection.risks,
});
</script>

<template>
  <div class="flex gap-6">
    <div class="flex-shrink-0 w-16 pt-4">
      <div
        v-for="slot in timeSlots"
        :key="slot"
        class="text-xs text-slate-400 font-mono text-right pr-3 h-12 flex items-center justify-end"
      >
        {{ String(Math.floor(slot / 60)).padStart(2, '0') }}:{{ String(slot % 60).padStart(2, '0') }}
      </div>
    </div>

    <div class="flex-1 relative">
      <div
        v-for="slot in timeSlots"
        :key="slot"
        class="absolute left-0 right-0 border-t border-dashed border-slate-200 pointer-events-none"
        :style="{ top: `${(slot - timeSlots[0]) * 0.8}px` }"
      />

      <draggable
        v-model="sortedNodesForDrag"
        item-key="id"
        handle=".drag-handle"
        ghost-class="sortable-ghost"
        chosen-class="sortable-chosen"
        drag-class="sortable-drag"
        animation="200"
        class="space-y-3"
      >
        <template #item="{ element, index }">
          <TimelineNode
            :node="element"
            :risks="riskDetection.risks.value"
            :selected="isSelected(element.id)"
            :has-order-mismatch="riskDetection.hasOrderMismatch.value"
            :index="index"
            @toggle-select="toggleSelect(element.id)"
          />
        </template>
      </draggable>

      <div
        v-if="filteredNodes.length === 0"
        class="text-center py-16 text-slate-500"
      >
        <div class="text-lg mb-2">暂无接待事项</div>
        <div class="text-sm text-slate-400">点击右上角「新增节点」开始规划流程</div>
      </div>
    </div>
  </div>
</template>
