<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { PanelRight } from 'lucide-vue-next';
import type { TimelineStore } from '@/composables/useTimeline';
import type { FilterStore } from '@/composables/useFilters';
import { useRiskDetection } from '@/composables/useRiskDetection';
import type { NodeStatus } from '@/types';

import FilterBar from '@/components/Filters/FilterBar.vue';
import BatchActionBar from '@/components/Filters/BatchActionBar.vue';
import TimelineContainer from '@/components/Timeline/TimelineContainer.vue';
import RiskSidebar from '@/components/RiskPanel/RiskSidebar.vue';

const props = defineProps<{
  timelineStore: TimelineStore;
  filterStore: FilterStore;
}>();

const timelineRef = ref<InstanceType<typeof TimelineContainer> | null>(null);
const riskSidebarVisible = ref(true);

const riskDetection = useRiskDetection(
  props.timelineStore.timelineNodes.value,
  props.timelineStore.lectureInfo,
  (id) => props.timelineStore.timelineNodes.value.find(n => n.id === id)
);

const risks = computed(() => riskDetection.risks.value);

const hasSelection = computed(() => timelineRef.value?.hasSelection ?? false);
const selectedCount = computed(() => timelineRef.value?.selectedIds?.size ?? 0);

function handleBatchUpdate(status: NodeStatus) {
  if (timelineRef.value) {
    const ids = Array.from(timelineRef.value.selectedIds);
    props.timelineStore.batchUpdateStatus(ids, status);
    timelineRef.value.clearSelection();
  }
}

function handleClearSelection() {
  timelineRef.value?.clearSelection();
}

function handleLocateNode(nodeId: string) {
  props.timelineStore.toggleNodeExpanded(nodeId);
  const element = document.querySelector(`[data-node-id="${nodeId}"]`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

watch(() => risks.value.length, () => {}, { deep: true });
</script>

<template>
  <div class="flex h-[calc(100vh-65px)]">
    <div class="flex-1 flex flex-col overflow-hidden">
      <FilterBar
        :filter-store="filterStore"
        :all-persons="timelineStore.allPersons.value"
      />

      <div class="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200">
        <div class="flex items-center gap-4">
          <h2 class="text-base font-semibold text-slate-800">接待流程时间线</h2>
          <span class="text-sm text-slate-500">
            共 {{ timelineStore.timelineNodes.value.length }} 项事项
          </span>
        </div>
        
        <button
          class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors"
          :class="[
            riskSidebarVisible
              ? 'bg-primary-100 text-primary-700'
              : 'text-slate-600 hover:bg-slate-100'
          ]"
          @click="riskSidebarVisible = !riskSidebarVisible"
        >
          <PanelRight :size="16" />
          风险面板
          <span
            v-if="risks.length > 0"
            class="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center"
            :class="risks.some(r => r.severity === 'error') ? 'bg-red-500' : 'bg-amber-500'"
          >
            {{ risks.length }}
          </span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto scrollbar-thin p-6">
        <TimelineContainer
          ref="timelineRef"
          :filter-store="filterStore"
        />
      </div>
    </div>

    <RiskSidebar
      :risks="risks"
      :visible="riskSidebarVisible"
      @close="riskSidebarVisible = false"
      @locate-node="handleLocateNode"
    />

    <BatchActionBar
      v-if="hasSelection"
      :selected-count="selectedCount"
      @batch-update="handleBatchUpdate"
      @clear-selection="handleClearSelection"
    />
  </div>
</template>
