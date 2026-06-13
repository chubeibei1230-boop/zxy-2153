import { computed, ref } from 'vue';
import type {
  HandoverSummary,
  LectureInfo,
  TimelineNode,
  RiskAlert,
  NodeStatus,
} from '@/types';
import { STATUS_LABELS } from '@/types';
import { addMinutesToTime, parseTimeToMinutes } from '@/utils/timeUtils';

export function useSummary(
  getLectureInfo: () => LectureInfo,
  getNodes: () => TimelineNode[],
  getRisks: () => RiskAlert[]
) {
  const reviewNotes = ref('');

  const statusOrder: NodeStatus[] = ['not_started', 'in_preparation', 'completed', 'delayed'];

  const summary = computed<HandoverSummary>(() => {
    const lectureInfo = getLectureInfo();
    const nodes = getNodes();
    const risks = getRisks();

    const totalTasks = nodes.length;
    const completedTasks = nodes.filter((n) => n.status === 'completed').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const statusCounts: Record<NodeStatus, number> = {
      not_started: 0,
      in_preparation: 0,
      completed: 0,
      delayed: 0,
    };
    nodes.forEach((node) => {
      statusCounts[node.status]++;
    });

    const statusSummary = statusOrder.map((status) => ({
      status,
      count: statusCounts[status],
      percentage: totalTasks > 0 ? Math.round((statusCounts[status] / totalTasks) * 100) : 0,
    }));

    const unfinishedItems = nodes
      .filter((n) => n.status !== 'completed')
      .sort((a, b) => {
        if (a.status === 'delayed' && b.status !== 'delayed') return -1;
        if (b.status === 'delayed' && a.status !== 'delayed') return 1;
        return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
      })
      .map((node) => ({
        id: node.id,
        name: node.name,
        startTime: node.startTime,
        durationMinutes: node.durationMinutes,
        personInCharge: node.personInCharge,
        status: node.status,
        notes: node.notes,
        requiredItems: [...node.requiredItems],
      }));

    const personMap = new Map<string, {
      total: number;
      completed: number;
      inPreparation: number;
      notStarted: number;
      delayed: number;
      taskNames: string[];
    }>();

    nodes.forEach((node) => {
      const name = node.personInCharge || '未指定';
      if (!personMap.has(name)) {
        personMap.set(name, {
          total: 0,
          completed: 0,
          inPreparation: 0,
          notStarted: 0,
          delayed: 0,
          taskNames: [],
        });
      }
      const data = personMap.get(name)!;
      data.total++;
      data.taskNames.push(node.name);
      if (node.status === 'completed') data.completed++;
      else if (node.status === 'in_preparation') data.inPreparation++;
      else if (node.status === 'not_started') data.notStarted++;
      else if (node.status === 'delayed') data.delayed++;
    });

    const personDistribution = Array.from(personMap.entries())
      .map(([name, data]) => ({
        name,
        total: data.total,
        completed: data.completed,
        inPreparation: data.inPreparation,
        notStarted: data.notStarted,
        delayed: data.delayed,
        progress: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        taskNames: data.taskNames,
      }))
      .sort((a, b) => b.total - a.total);

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const riskHandling = risks.map((risk) => {
      const relatedNodes = risk.relatedNodeIds
        .map((id) => nodeMap.get(id))
        .filter((n): n is TimelineNode => !!n);
      const relatedNodeNames = relatedNodes.map((n) => n.name);
      const relatedStatuses = relatedNodes.map((n) => n.status);
      const handled = relatedNodes.length > 0 && relatedNodes.every((n) => n.status === 'completed');
      return {
        id: risk.id,
        type: risk.type,
        message: risk.message,
        severity: risk.severity,
        relatedNodeNames,
        handled,
        relatedStatuses,
      };
    });

    const now = new Date();
    const generatedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const deadlineTime = addMinutesToTime(lectureInfo.startTime, -lectureInfo.bufferMinutes);

    return {
      lectureInfo: {
        name: lectureInfo.name,
        startTime: lectureInfo.startTime,
        bufferMinutes: lectureInfo.bufferMinutes,
        deadlineTime,
      },
      generatedAt,
      statusSummary,
      totalTasks,
      completedTasks,
      completionRate,
      unfinishedItems,
      personDistribution,
      riskHandling,
      reviewNotes: reviewNotes.value,
    };
  });

  function setReviewNotes(notes: string) {
    reviewNotes.value = notes;
  }

  function generatePlainText(): string {
    const s = summary.value;
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
        lines.push(`     时间：${item.startTime}（${item.durationMinutes}分钟）`);
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
        lines.push(`    已完成：${p.completed} | 准备中：${p.inPreparation} | 未开始：${p.notStarted} | 需延后：${p.delayed}`);
        lines.push(`    任务：${p.taskNames.join('、')}`);
      });
    }
    lines.push('');
    lines.push(`【风险提醒处理情况】`);
    if (s.riskHandling.length === 0) {
      lines.push('  ✓ 无风险提醒');
    } else {
      const handledCount = s.riskHandling.filter((r) => r.handled).length;
      lines.push(`  总计 ${s.riskHandling.length} 项风险，已处理 ${handledCount} 项`);
      s.riskHandling.forEach((risk, idx) => {
        const tag = risk.handled ? '✓ 已处理' : '⚠ 待处理';
        const sevTag = risk.severity === 'error' ? '【严重】' : '【警告】';
        lines.push(`  ${idx + 1}. ${sevTag} ${tag} - ${risk.message}`);
        if (risk.relatedNodeNames.length > 0) {
          lines.push(`     关联事项：${risk.relatedNodeNames.join('、')}`);
        }
      });
    }
    lines.push('');
    lines.push(`【复盘备注】`);
    lines.push(s.reviewNotes || '  （暂无备注，可补充填写）');
    lines.push('');
    lines.push('═══════════════════════════════════════════');

    return lines.join('\n');
  }

  return {
    summary,
    reviewNotes,
    setReviewNotes,
    generatePlainText,
  };
}

export type SummaryStore = ReturnType<typeof useSummary>;
