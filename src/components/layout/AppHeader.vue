<script setup lang="ts">
import { useRoute } from 'vue-router';
import { Calendar, ListTodo, Settings, Plus, Copy, LayoutDashboard } from 'lucide-vue-next';
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
    <div class="max-w-[1600px] mx-auto px-4 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
              <Calendar class="text-white" :size="18" />
            </div>
            <h1 class="text-lg font-semibold text-slate-800">
              <input
                v-model="store.lectureInfo.name"
                class="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none px-1 py-0.5 transition-colors w-[280px]"
                placeholder="输入讲座名称"
              />
            </h1>
          </div>

          <nav class="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <router-link
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
              :class="[
                route.path === item.path
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              ]"
            >
              <component :is="item.icon" :size="16" />
              {{ item.label }}
            </router-link>
          </nav>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 text-sm text-slate-600">
            <label class="flex items-center gap-1.5">
              <span class="whitespace-nowrap">讲座时间</span>
              <input
                v-model="store.lectureInfo.startTime"
                type="time"
                class="input input-sm w-[110px]"
              />
            </label>
            <label class="flex items-center gap-1.5">
              <Settings :size="14" />
              <span class="whitespace-nowrap">缓冲</span>
              <input
                v-model.number="store.lectureInfo.bufferMinutes"
                type="number"
                min="0"
                max="120"
                class="input input-sm w-[70px]"
              />
              <span>分钟</span>
            </label>
          </div>

          <div class="h-6 w-px bg-slate-300" />

          <div class="flex items-center gap-2">
            <button
              v-if="route.path === '/'"
              class="btn btn-secondary gap-1.5"
              @click="handleDuplicateLast"
            >
              <Copy :size="16" />
              复制上一项
            </button>
            <button
              v-if="route.path === '/'"
              class="btn btn-primary gap-1.5"
              @click="handleAddNode"
            >
              <Plus :size="16" />
              新增节点
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
