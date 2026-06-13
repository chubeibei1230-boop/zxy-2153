import { reactive, computed } from 'vue';
import type { FilterState, TimelineNode, NodeStatus, RiskAlert } from '@/types';
import { parseTimeToMinutes } from '@/utils/timeUtils';

export function createFilterStore() {
  const filters = reactive<FilterState>({
    persons: [],
    statuses: [],
    timeRangeStart: '',
    timeRangeEnd: '',
    hasAlertsOnly: false,
  });

  function togglePerson(person: string) {
    const index = filters.persons.indexOf(person);
    if (index > -1) {
      filters.persons.splice(index, 1);
    } else {
      filters.persons.push(person);
    }
  }

  function toggleStatus(status: NodeStatus) {
    const index = filters.statuses.indexOf(status);
    if (index > -1) {
      filters.statuses.splice(index, 1);
    } else {
      filters.statuses.push(status);
    }
  }

  function setTimeRange(start: string, end: string) {
    filters.timeRangeStart = start;
    filters.timeRangeEnd = end;
  }

  function toggleAlertsOnly() {
    filters.hasAlertsOnly = !filters.hasAlertsOnly;
  }

  function clearFilters() {
    filters.persons = [];
    filters.statuses = [];
    filters.timeRangeStart = '';
    filters.timeRangeEnd = '';
    filters.hasAlertsOnly = false;
  }

  const hasActiveFilters = computed(() => {
    return (
      filters.persons.length > 0 ||
      filters.statuses.length > 0 ||
      filters.timeRangeStart !== '' ||
      filters.timeRangeEnd !== '' ||
      filters.hasAlertsOnly
    );
  });

  function applyFilters(
    nodes: TimelineNode[],
    risks: RiskAlert[]
  ): TimelineNode[] {
    return nodes.filter(node => {
      if (filters.persons.length > 0 && !filters.persons.includes(node.personInCharge)) {
        return false;
      }

      if (filters.statuses.length > 0 && !filters.statuses.includes(node.status)) {
        return false;
      }

      if (filters.timeRangeStart) {
        const nodeStart = parseTimeToMinutes(node.startTime);
        const filterStart = parseTimeToMinutes(filters.timeRangeStart);
        if (nodeStart < filterStart) return false;
      }

      if (filters.timeRangeEnd) {
        const nodeEnd = parseTimeToMinutes(node.startTime) + node.durationMinutes;
        const filterEnd = parseTimeToMinutes(filters.timeRangeEnd);
        if (nodeEnd > filterEnd) return false;
      }

      if (filters.hasAlertsOnly) {
        const hasAlert = risks.some(r => r.relatedNodeIds.includes(node.id));
        if (!hasAlert) return false;
      }

      return true;
    });
  }

  return {
    filters,
    hasActiveFilters,
    togglePerson,
    toggleStatus,
    setTimeRange,
    toggleAlertsOnly,
    clearFilters,
    applyFilters,
  };
}

export type FilterStore = ReturnType<typeof createFilterStore>;
