<script setup lang="ts">import { computed } from 'vue';
import { Filter, Users, Clock, AlertTriangle, X } from 'lucide-vue-next';
import type { NodeStatus } from '@/types';
import { STATUS_LABELS } from '@/types';
import type { FilterStore } from '@/composables/useFilters';
const props = defineProps<{
 filterStore: FilterStore;
 allPersons: string[];
}>();
const statusOptions: {
 value: NodeStatus;
 label: string;
 color: string;
}[] = [
 { value: 'not_started', label: STATUS_LABELS.not_started, color: 'bg-slate-500' },
 { value: 'in_preparation', label: STATUS_LABELS.in_preparation, color: 'bg-sky-500' },
 { value: 'completed', label: STATUS_LABELS.completed, color: 'bg-emerald-500' },
 { value: 'delayed', label: STATUS_LABELS.delayed, color: 'bg-amber-500' },
];
const activeFilterCount = computed(() => {
 let count = 0;
 if (props.filterStore.filters.persons.length > 0)
 count++;
 if (props.filterStore.filters.statuses.length > 0)
 count++;
 if (props.filterStore.filters.timeRangeStart || props.filterStore.filters.timeRangeEnd)
 count++;
 if (props.filterStore.filters.hasAlertsOnly)
 count++;
 return count;
});
function isPersonSelected(person: string) {
 return props.filterStore.filters.persons.includes(person);
}
function isStatusSelected(status: NodeStatus) {
 return props.filterStore.filters.statuses.includes(status);
}
</script>

<template>
  <div class="bg-white border-b border-slate-200 p-4">
    <div class="flex items-center gap-4 flex-wrap">
      <div class="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Filter :size="16" />
        筛选
        <span
          v-if="activeFilterCount > 0"
          class="w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center"
        >
          {{ activeFilterCount }}
        </span>
      </div>

      <div class="h-5 w-px bg-slate-200" />

      <div class="flex items-center gap-2">
        <Users :size="14" class="text-slate-400" />
        <span class="text-sm text-slate-600">负责人：</span>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="person in allPersons"
            :key="person"
            class="px-2 py-0.5 text-xs rounded-md border transition-all"
            :class="[
              isPersonSelected(person)
                ? 'bg-primary-100 border-primary-400 text-primary-700'
                : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
            ]"
            @click="filterStore.togglePerson(person)"
          >
            {{ person }}
          </button>
        </div>
      </div>

      <div class="h-5 w-px bg-slate-200" />

      <div class="flex items-center gap-2">
        <span class="text-sm text-slate-600">状态：</span>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="opt in statusOptions"
            :key="opt.value"
            class="px-2 py-0.5 text-xs rounded-md border transition-all flex items-center gap-1"
            :class="[
              isStatusSelected(opt.value)
                ? 'bg-primary-100 border-primary-400 text-primary-700'
                : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
            ]"
            @click="filterStore.toggleStatus(opt.value)"
          >
            <span class="w-2 h-2 rounded-full" :class="opt.color" />
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div class="h-5 w-px bg-slate-200" />

      <div class="flex items-center gap-2">
        <Clock :size="14" class="text-slate-400" />
        <span class="text-sm text-slate-600">时间段：</span>
        <input
          v-model="filterStore.filters.timeRangeStart"
          type="time"
          class="input input-sm w-[90px]"
        />
        <span class="text-slate-400">至</span>
        <input
          v-model="filterStore.filters.timeRangeEnd"
          type="time"
          class="input input-sm w-[90px]"
        />
      </div>

      <div class="h-5 w-px bg-slate-200" />

      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          :checked="filterStore.filters.hasAlertsOnly"
          class="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          @change="filterStore.toggleAlertsOnly()"
        />
        <AlertTriangle :size="14" class="text-amber-500" />
        <span class="text-sm text-slate-600">仅显示有提醒</span>
      </label>

      <div class="flex-1" />

      <button
        v-if="filterStore.hasActiveFilters"
        class="btn btn-ghost gap-1 text-sm"
        @click="filterStore.clearFilters()"
      >
        <X :size="14" />
        清除筛选
      </button>
    </div>
  </div>
</template>
