<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import { createTimelineStore, provideTimelineStore } from '@/composables/useTimeline';
import { createFilterStore } from '@/composables/useFilters';
import AppHeader from '@/components/layout/AppHeader.vue';

const timelineStore = createTimelineStore();
const filterStore = createFilterStore();

provideTimelineStore(timelineStore);

const route = useRoute();
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <AppHeader />
    <main class="animate-fade-in">
      <RouterView :key="route.fullPath" :filter-store="filterStore" :timeline-store="timelineStore" />
    </main>
  </div>
</template>
