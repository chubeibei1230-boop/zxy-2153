<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import {
  Calendar,
  Clock,
  Timer,
  FileText,
  CheckCircle,
  AlertCircle,
  Users,
  AlertTriangle,
  StickyNote,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  PlayCircle,
  Package,
  RefreshCw,
  User,
  Printer,
  X,
  Info,
} from 'lucide-vue-next';
import type { HandoverSummary, NodeStatus, RiskType } from '@/types';
import { STATUS_LABELS, RISK_TYPE_LABELS } from '@/types';
import { getTimeDisplay } from '@/utils/timeUtils';

const props = defineProps<{
  summary: HandoverSummary;
  reviewNotes: string;
  isRiskHandled?: (key: string) => boolean;
}>();

const emit = defineEmits<{
  (e: 'update:reviewNotes', value: string): void;
  (e: 'toggle-risk-handled', riskKey: string): void;
}>();

const expandedSections = ref<Set<string>>(
  new Set(['status', 'unfinished', 'person', 'risk', 'notes'])
);

const refreshTick = ref(0);
let refreshInterval: number | null = null;

onMounted(() => {
  refreshInterval = window.setInterval(() => {
    refreshTick.value++;
  }, 60000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

function parseGeneratedAt(): Date {
  // generatedAt格式: "YYYY-MM-DD HH:mm"
  const parts = props.summary.generatedAt.split(' ');
  if (parts.length === 2) {
    const datePart = parts[0].split('-').map(Number);
    const timePart = parts[1].split(':').map(Number);
    return new Date(
      datePart[0],
      datePart[1] - 1,
      datePart[2],
      timePart[0],
      timePart[1]
    );
  }
  return new Date();
}

const relativeTime = computed(() => {
  // 触发响应式依赖
  void refreshTick.value;
  
  const genTime = parseGeneratedAt();
  const now = new Date();
  const diffMs = now.getTime() - genTime.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  
  if (diffSec < 60) return '刚刚生成';
  if (diffMin < 60) return `${diffMin} 分钟前更新`;
  if (diffHr < 24) return `${diffHr} 小时前更新`;
  return '今日更新';
});

type ToastType = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}
const toasts = ref<ToastItem[]>([]);
let toastIdCounter = 0;

function showToast(type: ToastType, message: string) {
  const id = ++toastIdCounter;
  toasts.value.push({ id, type, message });
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, 2500);
}

function toggleSection(section: string) {
  if (expandedSections.value.has(section)) {
    expandedSections.value.delete(section);
  } else {
    expandedSections.value.add(section);
  }
}

const statusIcons: Record<NodeStatus, any> = {
  not_started: Circle,
  in_preparation: PlayCircle,
  completed: CheckCircle,
  delayed: AlertCircle,
};

const statusColors: Record<NodeStatus, string> = {
  not_started: 'text-slate-500',
  in_preparation: 'text-sky-500',
  completed: 'text-emerald-500',
  delayed: 'text-amber-500',
};

const statusBgColors: Record<NodeStatus, string> = {
  not_started: 'bg-slate-100',
  in_preparation: 'bg-sky-100',
  completed: 'bg-emerald-100',
  delayed: 'bg-amber-100',
};

const statusBorderColors: Record<NodeStatus, string> = {
  not_started: 'border-slate-300',
  in_preparation: 'border-sky-400',
  completed: 'border-emerald-400',
  delayed: 'border-amber-400',
};

const riskIcons: Record<RiskType, any> = {
  time_overlap: Clock,
  person_overload: Users,
  items_missing: Package,
  end_time_exceed: Timer,
  order_mismatch: RefreshCw,
};

const overallStatus = computed(() => {
  const s = props.summary;
  const hasUnhandledErrorRisk = s.riskHandling.some(
    (r) => r.severity === 'error' && !r.handled
  );
  const hasActiveErrorRisk = s.riskHandling.some((r) => r.severity === 'error');
  const hasDelayed = s.unfinishedItems.some((i) => i.status === 'delayed');
  const hasUnhandledRisk = s.riskHandling.some((r) => !r.handled);

  if (s.completionRate === 100 && s.riskHandling.length === 0) {
    return {
      label: '全部完成',
      color: 'text-emerald-700',
      bg: 'bg-emerald-100',
      dot: 'bg-emerald-500',
      icon: CheckCircle,
    };
  }
  if (s.completionRate === 100 && !hasUnhandledRisk) {
    return {
      label: hasActiveErrorRisk ? '风险已记录' : '风险已处理',
      color: hasActiveErrorRisk ? 'text-amber-700' : 'text-sky-700',
      bg: hasActiveErrorRisk ? 'bg-amber-100' : 'bg-sky-100',
      dot: hasActiveErrorRisk ? 'bg-amber-500' : 'bg-sky-500',
      icon: hasActiveErrorRisk ? AlertTriangle : CheckCircle,
    };
  }
  if (hasUnhandledErrorRisk || hasDelayed) {
    return {
      label: '需重点关注',
      color: 'text-red-700',
      bg: 'bg-red-100',
      dot: 'bg-red-500',
      icon: AlertCircle,
    };
  }
  if (hasUnhandledRisk) {
    return {
      label: '有风险待关注',
      color: 'text-amber-700',
      bg: 'bg-amber-100',
      dot: 'bg-amber-500',
      icon: AlertTriangle,
    };
  }
  return {
    label: '正常推进',
    color: 'text-sky-700',
    bg: 'bg-sky-100',
    dot: 'bg-sky-500',
    icon: PlayCircle,
  };
});

const handledRiskCount = computed(() =>
  props.summary.riskHandling.filter((r) => r.handled).length
);

async function copyToClipboard() {
  try {
    const text = generateCopyText();
    if (!navigator.clipboard) {
      throw new Error('当前浏览器不支持 Clipboard API');
    }
    await navigator.clipboard.writeText(text);
    showToast('success', '摘要已复制到剪贴板');
  } catch (err) {
    console.error('复制失败:', err);
    showToast('error', '复制失败，请手动选中复制');
  }
}

function generateCopyText(): string {
  const s = props.summary;
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════');
  lines.push('  讲座接待方案 — 复盘与交接摘要');
  lines.push('═══════════════════════════════════════════');
  lines.push('');
  lines.push(`【讲座基本信息】`);
  lines.push(`  讲座名称：${s.lectureInfo.name}`);
  lines.push(`  开始时间：${s.lectureInfo.startTime}`);
  lines.push(`  缓冲时间：${s.lectureInfo.bufferMinutes} 分钟`);
  lines.push(`  准备截止：${s.lectureInfo.deadlineTime}`);
  lines.push(`  生成时间：${s.generatedAt}`);
  lines.push('');
  lines.push(`【执行状态汇总】`);
  lines.push(`  总事项数：${s.totalTasks} 项`);
  lines.push(`  已完成：${s.completedTasks} 项（完成率 ${s.completionRate}%）`);
  s.statusSummary.forEach((item) => {
    lines.push(`  ${STATUS_LABELS[item.status]}：${item.count} 项（${item.percentage}%）`);
  });
  lines.push('');
  lines.push(`【未完成 / 需延后事项清单】（共 ${s.unfinishedItems.length} 项）`);
  if (s.unfinishedItems.length === 0) {
    lines.push('  ✓ 所有事项均已完成');
  } else {
    s.unfinishedItems.forEach((item, idx) => {
      lines.push(`  ${idx + 1}. [${STATUS_LABELS[item.status]}] ${item.name}`);
      lines.push(`     时间：${getTimeDisplay(item.startTime, item.durationMinutes)}`);
      lines.push(`     负责人：${item.personInCharge || '未指定'}`);
      if (item.requiredItems.length > 0) {
        lines.push(`     所需物品：${item.requiredItems.join('、')}`);
      }
      if (item.notes) {
        lines.push(`     备注：${item.notes}`);
      }
    });
  }
  lines.push('');
  lines.push(`【负责人任务分布】`);
  if (s.personDistribution.length === 0) {
    lines.push('  暂无负责人分配');
  } else {
    s.personDistribution.forEach((p) => {
      lines.push(`  ▸ ${p.name}（共 ${p.total} 项，完成率 ${p.progress}%）`);
      lines.push(
        `    已完成：${p.completed} | 准备中：${p.inPreparation} | 未开始：${p.notStarted} | 需延后：${p.delayed}`
      );
      lines.push(`    任务：${p.taskNames.join('、')}`);
    });
  }
  lines.push('');
  lines.push(`【风险提醒处理情况】`);
  if (s.riskHandling.length === 0) {
    lines.push('  ✓ 无风险提醒');
  } else {
    lines.push(`  总计 ${s.riskHandling.length} 项风险，已标记处理 ${handledRiskCount.value} 项`);
    s.riskHandling.forEach((risk, idx) => {
      const tag = risk.handled ? '✓ 已标记处理' : '⚠ 待关注';
      const sevTag = risk.severity === 'error' ? '【严重】' : '【警告】';
      lines.push(`  ${idx + 1}. ${sevTag} ${tag} - ${risk.message}`);
      if (risk.relatedNodeNames.length > 0) {
        lines.push(`     关联事项：${risk.relatedNodeNames.join('、')}`);
      }
    });
  }
  lines.push('');
  lines.push(`【复盘备注】`);
  lines.push(props.reviewNotes || '  （暂无备注，可补充填写）');
  lines.push('');
  lines.push('═══════════════════════════════════════════');

  return lines.join('\n');
}

function handlePrint() {
  try {
    window.print();
  } catch (err) {
    showToast('error', '打印功能调用失败');
  }
}

function handleToggleRisk(riskKey: string) {
  const wasHandled = props.isRiskHandled?.(riskKey) ?? false;
  emit('toggle-risk-handled', riskKey);
  showToast('info', wasHandled ? '已取消标记' : '已标记为处理');
}

function dismissToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}
</script>

<template>
  <div class="space-y-5">
    <div class="fixed top-20 right-4 z-50 space-y-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border min-w-[240px] max-w-sm"
          :class="{
            'bg-emerald-50 border-emerald-200 text-emerald-800': toast.type === 'success',
            'bg-red-50 border-red-200 text-red-800': toast.type === 'error',
            'bg-sky-50 border-sky-200 text-sky-800': toast.type === 'info',
          }"
        >
          <CheckCircle v-if="toast.type === 'success'" :size="18" class="flex-shrink-0" />
          <AlertCircle v-else-if="toast.type === 'error'" :size="18" class="flex-shrink-0" />
          <Info v-else :size="18" class="flex-shrink-0" />
          <span class="text-sm flex-1">{{ toast.message }}</span>
          <button
            class="text-current/60 hover:text-current transition-colors"
            @click="dismissToast(toast.id)"
          >
            <X :size="14" />
          </button>
        </div>
      </TransitionGroup>
    </div>

    <div class="card overflow-hidden">
      <div class="bg-gradient-to-r from-primary-700 to-primary-600 px-5 sm:px-6 py-5 text-white">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText :size="24" />
            </div>
            <div class="min-w-0">
              <h1 class="text-xl sm:text-2xl font-bold mb-1">讲座接待方案 — 复盘与交接摘要</h1>
              <p class="text-sm text-white/80 flex items-center gap-1.5 flex-wrap">
                <Clock :size="14" />
                <span>生成时间：{{ summary.generatedAt }}</span>
                <span class="text-white/60">·</span>
                <span class="flex items-center gap-1">
                  <RefreshCw :size="12" />
                  {{ relativeTime }}
                </span>
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5"
              :class="[overallStatus.bg, overallStatus.color]"
            >
              <span class="w-2 h-2 rounded-full animate-pulse-soft" :class="overallStatus.dot" />
              <component :is="overallStatus.icon" :size="14" />
              {{ overallStatus.label }}
            </span>
          </div>
        </div>
      </div>

      <div class="p-5 sm:p-6 border-b border-slate-100">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar :size="18" class="text-primary-600" />
            </div>
            <div class="min-w-0">
              <div class="text-xs text-slate-500 mb-0.5">讲座名称</div>
              <div class="text-sm font-semibold text-slate-800 truncate" :title="summary.lectureInfo.name">
                {{ summary.lectureInfo.name }}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock :size="18" class="text-sky-600" />
            </div>
            <div>
              <div class="text-xs text-slate-500 mb-0.5">开始时间</div>
              <div class="text-sm font-semibold text-slate-800">{{ summary.lectureInfo.startTime }}</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Timer :size="18" class="text-violet-600" />
            </div>
            <div>
              <div class="text-xs text-slate-500 mb-0.5">缓冲时间</div>
              <div class="text-sm font-semibold text-slate-800">{{ summary.lectureInfo.bufferMinutes }} 分钟</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle :size="18" class="text-amber-600" />
            </div>
            <div>
              <div class="text-xs text-slate-500 mb-0.5">准备截止</div>
              <div class="text-sm font-semibold text-slate-800">{{ summary.lectureInfo.deadlineTime }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-5 sm:px-6 py-3 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div class="text-xs text-slate-500">
          摘要已生成，可复制分享给相关人员或打印留档
        </div>
        <div class="flex items-center gap-2">
          <button
            class="btn btn-secondary gap-1.5 text-sm"
            @click="handlePrint"
          >
            <Printer :size="14" />
            <span class="hidden sm:inline">打印</span>
          </button>
          <button
            class="btn btn-primary gap-1.5 text-sm"
            :class="toasts.some(t => t.type === 'success') ? 'bg-emerald-600 hover:bg-emerald-700' : ''"
            @click="copyToClipboard"
          >
            <component :is="toasts.some(t => t.type === 'success') ? Check : Copy" :size="14" />
            {{ toasts.some(t => t.type === 'success') ? '已复制' : '复制全文' }}
          </button>
        </div>
      </div>
    </div>

    <div class="card overflow-hidden">
      <button
        class="w-full flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-slate-50 transition-colors"
        @click="toggleSection('status')"
      >
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <CheckCircle :size="16" class="text-emerald-600" />
          </div>
          <div class="text-left">
            <h2 class="text-base font-semibold text-slate-800">执行状态汇总</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              共 {{ summary.totalTasks }} 项，已完成 {{ summary.completedTasks }} 项
            </p>
          </div>
        </div>
        <ChevronDown v-if="!expandedSections.has('status')" :size="20" class="text-slate-400" />
        <ChevronUp v-else :size="20" class="text-slate-400" />
      </button>

      <div v-show="expandedSections.has('status')">
        <div class="px-5 sm:px-6 pb-5">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5">
            <div
              v-for="item in summary.statusSummary"
              :key="item.status"
              class="p-4 rounded-xl border transition-all"
              :class="[statusBorderColors[item.status], 'bg-white']"
            >
              <div class="flex items-center gap-2 mb-3">
                <div
                  class="w-8 h-8 rounded-lg flex items-center justify-center"
                  :class="statusBgColors[item.status]"
                >
                  <component :is="statusIcons[item.status]" :size="16" :class="statusColors[item.status]" />
                </div>
                <span class="text-sm font-medium text-slate-700">{{ STATUS_LABELS[item.status] }}</span>
              </div>
              <div class="flex items-baseline gap-2">
                <span class="text-3xl font-bold" :class="statusColors[item.status]">
                  {{ item.count }}
                </span>
                <span class="text-sm text-slate-500">项</span>
                <span class="ml-auto text-xs font-medium px-2 py-0.5 rounded-full" :class="[statusBgColors[item.status], statusColors[item.status]]">
                  {{ item.percentage }}%
                </span>
              </div>
            </div>
          </div>

          <div class="p-4 bg-slate-50 rounded-xl">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-slate-700">整体完成进度</span>
              <span class="text-lg font-bold" :class="summary.completionRate === 100 ? 'text-emerald-600' : 'text-primary-700'">
                {{ summary.completionRate }}%
              </span>
            </div>
            <div class="w-full h-3 bg-white rounded-full overflow-hidden border border-slate-200">
              <div
                class="h-full rounded-full transition-all duration-700 ease-out"
                :class="[
                  summary.completionRate === 100
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                    : 'bg-gradient-to-r from-primary-400 to-primary-600'
                ]"
                :style="{ width: `${summary.completionRate}%` }"
              />
            </div>
            <div class="flex justify-between mt-2 text-xs text-slate-500">
              <span>{{ summary.completedTasks }} 项已完成</span>
              <span>{{ summary.totalTasks - summary.completedTasks }} 项待处理</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card overflow-hidden">
      <button
        class="w-full flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-slate-50 transition-colors"
        @click="toggleSection('unfinished')"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center"
            :class="summary.unfinishedItems.length > 0 ? 'bg-amber-100' : 'bg-emerald-100'"
          >
            <AlertCircle
              v-if="summary.unfinishedItems.length > 0"
              :size="16"
              class="text-amber-600"
            />
            <CheckCircle v-else :size="16" class="text-emerald-600" />
          </div>
          <div class="text-left">
            <h2 class="text-base font-semibold text-slate-800">未完成 / 需延后事项清单</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ summary.unfinishedItems.length > 0 ? `共 ${summary.unfinishedItems.length} 项待跟进` : '所有事项均已完成' }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span
            v-if="summary.unfinishedItems.length > 0"
            class="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700"
          >
            {{ summary.unfinishedItems.length }}
          </span>
          <ChevronDown v-if="!expandedSections.has('unfinished')" :size="20" class="text-slate-400" />
          <ChevronUp v-else :size="20" class="text-slate-400" />
        </div>
      </button>

      <div v-show="expandedSections.has('unfinished')">
        <div v-if="summary.unfinishedItems.length === 0" class="px-5 sm:px-6 pb-6">
          <div class="p-8 bg-emerald-50 rounded-xl text-center border border-emerald-200">
            <div class="w-14 h-14 mx-auto mb-3 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle :size="28" class="text-emerald-600" />
            </div>
            <h3 class="text-lg font-semibold text-emerald-800 mb-1">全部完成！</h3>
            <p class="text-sm text-emerald-600">本场讲座的所有接待事项均已完成</p>
          </div>
        </div>

        <div v-else class="divide-y divide-slate-100">
          <div
            v-for="(item, idx) in summary.unfinishedItems"
            :key="item.id"
            class="px-5 sm:px-6 py-4 transition-colors"
            :class="item.status === 'delayed' ? 'bg-amber-50/40' : 'hover:bg-slate-50'"
          >
            <div class="flex items-start gap-4">
              <div
                class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                :class="[
                  item.status === 'delayed' ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-600'
                ]"
              >
                {{ idx + 1 }}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-2">
                  <h3 class="text-base font-semibold text-slate-800">{{ item.name }}</h3>
                  <span
                    class="tag text-[11px] flex-shrink-0"
                    :class="[statusBgColors[item.status], statusColors[item.status]]"
                  >
                    <component :is="statusIcons[item.status]" :size="10" />
                    {{ STATUS_LABELS[item.status] }}
                  </span>
                </div>
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
                  <span class="flex items-center gap-1.5">
                    <Clock :size="14" class="text-slate-400" />
                    {{ getTimeDisplay(item.startTime, item.durationMinutes) }}
                  </span>
                  <span v-if="item.personInCharge" class="flex items-center gap-1.5">
                    <User :size="14" class="text-slate-400" />
                    {{ item.personInCharge }}
                  </span>
                  <span v-else class="flex items-center gap-1.5 text-slate-400">
                    <User :size="14" />
                    未指定负责人
                  </span>
                  <span v-if="item.requiredItems.length > 0" class="flex items-center gap-1.5">
                    <Package :size="14" class="text-slate-400" />
                    {{ item.requiredItems.join('、') }}
                  </span>
                </div>
                <div
                  v-if="item.notes"
                  class="mt-2.5 p-3 bg-white rounded-lg border border-slate-200"
                >
                  <div class="flex items-start gap-2">
                    <StickyNote :size="14" class="text-slate-400 mt-0.5 flex-shrink-0" />
                    <p class="text-sm text-slate-600 leading-relaxed">{{ item.notes }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card overflow-hidden">
      <button
        class="w-full flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-slate-50 transition-colors"
        @click="toggleSection('person')"
      >
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
            <Users :size="16" class="text-sky-600" />
          </div>
          <div class="text-left">
            <h2 class="text-base font-semibold text-slate-800">负责人任务分布</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              共 {{ summary.personDistribution.length }} 位负责人
            </p>
          </div>
        </div>
        <ChevronDown v-if="!expandedSections.has('person')" :size="20" class="text-slate-400" />
        <ChevronUp v-else :size="20" class="text-slate-400" />
      </button>

      <div v-show="expandedSections.has('person')">
        <div v-if="summary.personDistribution.length === 0" class="px-5 sm:px-6 pb-6">
          <div class="p-6 bg-slate-50 rounded-xl text-center">
            <p class="text-sm text-slate-500">暂无负责人分配</p>
          </div>
        </div>

        <div v-else class="px-5 sm:px-6 pb-5 space-y-3">
          <div
            v-for="person in summary.personDistribution"
            :key="person.name"
            class="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
          >
            <div class="flex items-start justify-between gap-4 mb-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 bg-gradient-to-br from-sky-400 to-sky-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {{ person.name.charAt(0) }}
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-slate-800">{{ person.name }}</h3>
                  <p class="text-xs text-slate-500 mt-0.5">
                    共 {{ person.total }} 项任务
                  </p>
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <div
                  class="text-2xl font-bold"
                  :class="[
                    person.progress === 100 ? 'text-emerald-600' : person.delayed > 0 ? 'text-amber-600' : 'text-sky-600'
                  ]"
                >
                  {{ person.progress }}%
                </div>
                <div class="text-xs text-slate-500">完成率</div>
              </div>
            </div>

            <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="[
                  person.progress === 100
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                    : person.delayed > 0
                    ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                    : 'bg-gradient-to-r from-sky-400 to-sky-600'
                ]"
                :style="{ width: `${person.progress}%` }"
              />
            </div>

            <div class="grid grid-cols-4 gap-2 mb-3">
              <div class="text-center p-2 rounded-lg" :class="statusBgColors.completed">
                <div class="text-lg font-bold" :class="statusColors.completed">{{ person.completed }}</div>
                <div class="text-[10px]" :class="statusColors.completed">已完成</div>
              </div>
              <div class="text-center p-2 rounded-lg" :class="statusBgColors.in_preparation">
                <div class="text-lg font-bold" :class="statusColors.in_preparation">{{ person.inPreparation }}</div>
                <div class="text-[10px]" :class="statusColors.in_preparation">准备中</div>
              </div>
              <div class="text-center p-2 rounded-lg" :class="statusBgColors.not_started">
                <div class="text-lg font-bold" :class="statusColors.not_started">{{ person.notStarted }}</div>
                <div class="text-[10px]" :class="statusColors.not_started">未开始</div>
              </div>
              <div class="text-center p-2 rounded-lg" :class="statusBgColors.delayed">
                <div class="text-lg font-bold" :class="statusColors.delayed">{{ person.delayed }}</div>
                <div class="text-[10px]" :class="statusColors.delayed">需延后</div>
              </div>
            </div>

            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="taskName in person.taskNames"
                :key="taskName"
                class="text-[11px] px-2 py-1 rounded-md bg-slate-100 text-slate-600"
              >
                {{ taskName }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card overflow-hidden">
      <button
        class="w-full flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-slate-50 transition-colors"
        @click="toggleSection('risk')"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center"
            :class="[
              summary.riskHandling.length === 0
                ? 'bg-emerald-100'
                : handledRiskCount < summary.riskHandling.length
                ? 'bg-red-100'
                : 'bg-amber-100'
            ]"
          >
            <CheckCircle
              v-if="summary.riskHandling.length === 0 || handledRiskCount === summary.riskHandling.length"
              :size="16"
              class="text-emerald-600"
            />
            <AlertTriangle v-else :size="16" class="text-red-600" />
          </div>
          <div class="text-left">
            <h2 class="text-base font-semibold text-slate-800">风险提醒处理情况</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ summary.riskHandling.length === 0
                ? '未检测到风险'
                : `共 ${summary.riskHandling.length} 项风险，已标记 ${handledRiskCount} 项处理` }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span
            v-if="summary.riskHandling.length > 0 && handledRiskCount < summary.riskHandling.length"
            class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700"
          >
            {{ summary.riskHandling.length - handledRiskCount }} 待关注
          </span>
          <ChevronDown v-if="!expandedSections.has('risk')" :size="20" class="text-slate-400" />
          <ChevronUp v-else :size="20" class="text-slate-400" />
        </div>
      </button>

      <div v-show="expandedSections.has('risk')">
        <div v-if="summary.riskHandling.length === 0" class="px-5 sm:px-6 pb-6">
          <div class="p-8 bg-emerald-50 rounded-xl text-center border border-emerald-200">
            <div class="w-14 h-14 mx-auto mb-3 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle :size="28" class="text-emerald-600" />
            </div>
            <h3 class="text-lg font-semibold text-emerald-800 mb-1">无风险提醒</h3>
            <p class="text-sm text-emerald-600">流程安排合理，未检测到风险</p>
          </div>
        </div>

        <div v-else class="divide-y divide-slate-100">
          <div
            v-for="(risk, idx) in summary.riskHandling"
            :key="risk.id"
            class="px-5 sm:px-6 py-4 transition-colors group"
            :class="[
              risk.handled ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : risk.severity === 'error' ? 'bg-red-50/40' : 'bg-amber-50/40'
            ]"
          >
            <div class="flex items-start gap-4">
              <div
                class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                :class="[
                  risk.handled
                    ? 'bg-emerald-100 text-emerald-700'
                    : risk.severity === 'error'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                ]"
              >
                {{ idx + 1 }}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    class="tag text-[11px] flex items-center gap-1"
                    :class="[
                      risk.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    ]"
                  >
                    <component :is="riskIcons[risk.type]" :size="10" />
                    {{ RISK_TYPE_LABELS[risk.type] }}
                  </span>
                  <span
                    v-if="risk.severity === 'error'"
                    class="tag text-[11px] bg-red-50 text-red-600 font-medium"
                  >
                    严重
                  </span>
                  <span
                    class="tag text-[11px] flex items-center gap-1"
                    :class="[
                      risk.handled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    ]"
                  >
                    <component :is="risk.handled ? CheckCircle : AlertCircle" :size="10" />
                    {{ risk.handled ? '已标记处理' : '待关注' }}
                  </span>
                </div>
                <p class="text-sm text-slate-700 leading-relaxed mb-2">{{ risk.message }}</p>
                <div v-if="risk.relatedNodeNames.length > 0" class="flex flex-wrap gap-1.5 mb-3">
                  <span class="text-[11px] text-slate-500">关联事项：</span>
                  <span
                    v-for="name in risk.relatedNodeNames"
                    :key="name"
                    class="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600"
                  >
                    {{ name }}
                  </span>
                </div>
                <button
                  class="text-xs px-3 py-1.5 rounded-md border transition-all hover:shadow-sm"
                  :class="[
                    risk.handled
                      ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  ]"
                  @click="handleToggleRisk(risk.id)"
                >
                  <CheckCircle v-if="risk.handled" :size="12" class="inline mr-1" />
                  {{ risk.handled ? '取消标记' : '标记为已处理' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card overflow-hidden">
      <button
        class="w-full flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-slate-50 transition-colors"
        @click="toggleSection('notes')"
      >
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
            <StickyNote :size="16" class="text-violet-600" />
          </div>
          <div class="text-left">
            <h2 class="text-base font-semibold text-slate-800">复盘备注</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ reviewNotes ? '已填写备注' : '可补充填写复盘内容、经验总结等' }}
            </p>
          </div>
        </div>
        <ChevronDown v-if="!expandedSections.has('notes')" :size="20" class="text-slate-400" />
        <ChevronUp v-else :size="20" class="text-slate-400" />
      </button>

      <div v-show="expandedSections.has('notes')" class="px-5 sm:px-6 pb-6">
        <div class="mt-2">
          <label class="block text-sm font-medium text-slate-700 mb-2">
            补充复盘内容
          </label>
          <textarea
            :value="reviewNotes"
            @input="emit('update:reviewNotes', ($event.target as HTMLTextAreaElement).value)"
            rows="5"
            class="input resize-y"
            placeholder="请输入复盘备注，例如：本次接待中的亮点、需改进之处、下次注意事项、经验总结等..."
          />
          <div class="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>支持多行文本，内容将包含在复制的摘要中并自动保存</span>
            <span>{{ reviewNotes.length }} 字</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
