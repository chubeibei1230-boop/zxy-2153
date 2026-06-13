<script setup lang="ts">
import { computed } from 'vue';
import { 
  AlertTriangle, Clock, Users, Package, Timer, ArrowRightLeft,
  ChevronRight, X
} from 'lucide-vue-next';
import type { RiskAlert, RiskType } from '@/types';
import { RISK_TYPE_LABELS } from '@/types';

const props = defineProps<{
  risks: RiskAlert[];
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'locate-node', nodeId: string): void;
}>();

const riskIcons: Record<RiskType, any> = {
  time_overlap: Clock,
  person_overload: Users,
  items_missing: Package,
  end_time_exceed: Timer,
  order_mismatch: ArrowRightLeft,
};

const errorCount = computed(() => props.risks.filter(r => r.severity === 'error').length);
const warningCount = computed(() => props.risks.filter(r => r.severity === 'warning').length);

const groupedRisks = computed(() => {
  const groups: Record<RiskType, RiskAlert[]> = {
    time_overlap: [],
    person_overload: [],
    items_missing: [],
    end_time_exceed: [],
    order_mismatch: [],
  };
  
  props.risks.forEach(r => {
    groups[r.type].push(r);
  });
  
  return groups;
});

function handleLocate(nodeId: string) {
  emit('locate-node', nodeId);
}
</script>

<template>
  <aside
    class="w-80 bg-white border-l border-slate-200 flex flex-col h-full transition-all duration-300"
    :class="visible ? 'translate-x-0' : 'translate-x-full hidden'"
  >
    <div class="p-4 border-b border-slate-200 flex items-center justify-between">
      <div>
        <h2 class="text-base font-semibold text-slate-800 flex items-center gap-2">
          <AlertTriangle :size="18" class="text-amber-500" />
          风险提醒
        </h2>
        <div class="flex gap-3 mt-1 text-xs">
          <span v-if="errorCount > 0" class="text-red-600">
            {{ errorCount }} 项错误
          </span>
          <span v-if="warningCount > 0" class="text-amber-600">
            {{ warningCount }} 项警告
          </span>
          <span v-if="risks.length === 0" class="text-emerald-600">
            一切正常
          </span>
        </div>
      </div>
      <button
        class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
        @click="emit('close')"
      >
        <X :size="18" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
      <template v-if="risks.length === 0">
        <div class="text-center py-12">
          <div class="w-16 h-16 mx-auto mb-3 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="text-slate-600 font-medium">没有检测到风险</div>
          <div class="text-sm text-slate-400 mt-1">流程安排合理</div>
        </div>
      </template>

      <template v-else>
        <div
          v-for="(typeRisks, type) in groupedRisks"
          :key="type"
          v-show="typeRisks.length > 0"
          class="space-y-2"
        >
          <div class="flex items-center gap-2 text-sm font-medium text-slate-700">
            <component :is="riskIcons[type as RiskType]" :size="16" />
            {{ RISK_TYPE_LABELS[type as RiskType] }}
            <span class="text-xs text-slate-400">({{ typeRisks.length }})</span>
          </div>
          
          <div
            v-for="risk in typeRisks"
            :key="risk.id"
            class="p-3 rounded-lg border transition-colors cursor-pointer hover:shadow-sm"
            :class="[
              risk.severity === 'error'
                ? 'bg-red-50 border-red-200 hover:bg-red-100'
                : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
            ]"
            @click="handleLocate(risk.relatedNodeIds[0])"
          >
            <div class="flex items-start gap-2">
              <div
                class="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                :class="risk.severity === 'error' ? 'bg-red-500' : 'bg-amber-500'"
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm text-slate-700 leading-relaxed">
                  {{ risk.message }}
                </p>
                <div class="flex items-center gap-1 mt-2 text-xs"
                  :class="risk.severity === 'error' ? 'text-red-600' : 'text-amber-600'"
                >
                  查看详情
                  <ChevronRight :size="12" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </aside>
</template>
