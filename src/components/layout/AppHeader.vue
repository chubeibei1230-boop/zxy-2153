<script setup lang="ts">
import { useRoute } from 'vue-router';
import { Calendar, ListTodo, Settings, Plus, Copy, LayoutDashboard, FileText } from 'lucide-vue-next';
import { useTimelineStore } from '@/composables/useTimeline';

const route = useRoute();
const store = useTimelineStore();

const navItems = [
  { path: '/', label: '流程编排', icon: Calendar },
  { path: '/overview', label: '指挥总览', icon: LayoutDashboard },
  { path: '/execution', label: '现场执行', icon: ListTodo },
];

function handleAddNode() {
  store.addNode();
}

function handleDuplicateLast() {
  store.duplicateLastNode();
}
</script>

<template>
  <header class="bg-white border-b border-slate-200 sticky top-0 z-50">
    <div class="max-w-[1600px] mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 sm:gap-3">
        <div class="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar class="text-white" :size="18" />
            </div>
            <h1 class="text-base sm:text-lg font-semibold text-slate-800 min-w-0">
              <input
                v-model="store.lectureInfo.name"
                class="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none px-1 py-0.5 transition-colors w-[180px] sm:w-[240px] md:w-[280px]"
                placeholder="输入讲座名称"
              />
            </h1>
          </div>

          <nav class="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto flex-1 min-w-0 scrollbar-thin">
            <router-link
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0"
              :class="[
                route.path === item.path
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              ]"
            >
              <component :is="item.icon" :size="16" />
              <span class="hidden xs:inline">{{ item.label }}</span>
            </router-link>
            <router-link
              to="/summary"
              class="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ml-0.5 sm:ml-1 whitespace-nowrap flex-shrink-0"
              :class="[
                route.path === '/summary'
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-sm'
                  : 'bg-gradient-to-r from-primary-50 to-primary-100 text-primary-700 hover:from-primary-100 hover:to-primary-200'
              ]"
            >
              <FileText :size="16" />
              <span class="hidden xs:inline">交接摘要</span>
            </router-link>
          </nav>
        </div>

        <div class="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          <div class="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 flex-wrap">
            <label class="flex items-center gap-1.5">
              <span class="whitespace-nowrap hidden sm:inline">讲座时间</span>
              <span class="whitespace-nowrap sm:hidden">时间</span>
              <input
                v-model="store.lectureInfo.startTime"
                type="time"
                class="input input-sm w-[90px] sm:w-[110px]"
              />
            </label>
            <label class="flex items-center gap-1.5">
              <Settings :size="14" />
              <span class="whitespace-nowrap hidden sm:inline">缓冲</span>
              <input
                v-model.number="store.lectureInfo.bufferMinutes"
                type="number"
                min="0"
                max="120"
                class="input input-sm w-[55px] sm:w-[70px]"
              />
              <span class="whitespace-nowrap">分</span>
            </label>
          </div>

          <div class="h-5 sm:h-6 w-px bg-slate-300 hidden sm:block" />

          <div class="flex items-center gap-2">
            <button
              v-if="route.path === '/'"
              class="btn btn-secondary gap-1.5 text-xs sm:text-sm !px-2 sm:!px-3"
              @click="handleDuplicateLast"
            >
              <Copy :size="14" />
              <span class="hidden sm:inline">复制上一项</span>
              <span class="sm:hidden">复制</span>
            </button>
            <button
              v-if="route.path === '/'"
              class="btn btn-primary gap-1.5 text-xs sm:text-sm !px-2 sm:!px-3"
              @click="handleAddNode"
            >
              <Plus :size="14" />
              <span class="hidden sm:inline">新增节点</span>
              <span class="sm:hidden">新增</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
