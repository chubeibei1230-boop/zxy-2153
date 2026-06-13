<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, FileText, RefreshCw } from 'lucide-vue-next';
import type { TimelineStore } from '@/composables/useTimeline';
import type { FilterStore } from '@/composables/useFilters';
import { useRiskDetection } from '@/composables/useRiskDetection';
import { useSummary } from '@/composables/useSummary';
import HandoverSummary from '@/components/Summary/HandoverSummary.vue';

const props = defineProps<{
  timelineStore: TimelineStore;
  filterStore: FilterStore;
}>();

const router = useRouter();

const riskDetection = useRiskDetection(
  () => props.timelineStore.timelineNodes.value,
  () => props.timelineStore.lectureInfo
);

const risks = computed(() => riskDetection.risks.value);

const { summary, generatePlainText } = useSummary(
  () => props.timelineStore.lectureInfo,
  () => props.timelineStore.timelineNodes.value,
  () => risks.value,
  () => props.timelineStore
);

const localNotes = ref(props.timelineStore.reviewNotes.value);

watch(
  () => props.timelineStore.reviewNotes.value,
  (val) => {
    if (val !== localNotes.value) {
      localNotes.value = val;
    }
  }
);

watch(
  () => risks.value.map((risk) => risk.key).join('|'),
  () => {
    props.timelineStore.pruneHandledRiskKeys(risks.value.map((risk) => risk.key));
  },
  { immediate: true }
);

function handleNotesChange(val: string) {
  localNotes.value = val;
  props.timelineStore.setReviewNotes(val);
}

function handleToggleRiskHandled(riskKey: string) {
  props.timelineStore.toggleRiskHandled(riskKey);
}

function goBack() {
  const backPath = router.options.history.state.back;
  if (typeof backPath === 'string' && backPath.startsWith('/')) {
    router.back();
  } else {
    router.push('/overview');
  }
}

function goToOverview() {
  router.push('/overview');
}

function generateText(): string {
  return generatePlainText(localNotes.value);
}

defineExpose({
  generateText,
});
</script>

<template>
  <div class="min-h-[calc(100vh-65px)] bg-slate-50">
    <div class="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-3">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <button
              class="btn btn-ghost gap-1.5 !px-2 !py-1.5"
              @click="goBack"
            >
              <ArrowLeft :size="18" />
              <span class="hidden sm:inline">返回</span>
            </button>
            <div class="h-6 w-px bg-slate-200 hidden sm:block" />
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText :size="16" class="text-primary-600" />
              </div>
              <div class="min-w-0">
                <h1 class="text-base font-semibold text-slate-800 truncate">交接摘要</h1>
                <p class="text-xs text-slate-500 hidden sm:block">
                  一键生成本场讲座的复盘与交接信息
                </p>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              class="btn btn-secondary gap-1.5 text-sm"
              @click="goToOverview"
            >
              <RefreshCw :size="14" />
              <span class="hidden sm:inline">返回总览</span>
              <span class="sm:hidden">总览</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
      <HandoverSummary
        :summary="summary"
        :review-notes="localNotes"
        :is-risk-handled="(key: string) => timelineStore.isRiskHandled(key)"
        @update:review-notes="handleNotesChange"
        @toggle-risk-handled="handleToggleRiskHandled"
      />
    </div>
  </div>
</template>
