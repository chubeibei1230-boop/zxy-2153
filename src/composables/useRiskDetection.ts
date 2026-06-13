import { computed } from 'vue';
import type { RiskAlert, TimelineNode, LectureInfo } from '@/types';
import { generateUUID } from '@/utils/uuid';
import { parseTimeToMinutes, getEndTime, isTimeOverlap, getTimeGap } from '@/utils/timeUtils';

const PERSON_GAP_THRESHOLD = 10;

export function useRiskDetection(
  getNodes: () => TimelineNode[],
  getLectureInfo: () => LectureInfo
) {
  const risks = computed<RiskAlert[]>(() => {
    const nodes = getNodes();
    const lectureInfo = getLectureInfo();
    const alerts: RiskAlert[] = [];
    const sortedByOrder = [...nodes].sort((a, b) => a.sortOrder - b.sortOrder);
    const sortedByTime = [...nodes].sort((a, b) =>
      parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
    );

    const seen = new Set<string>();

    function addAlert(alert: Omit<RiskAlert, 'id'>) {
      const key = `${alert.type}-${alert.relatedNodeIds.slice().sort().join(',')}`;
      if (!seen.has(key)) {
        seen.add(key);
        alerts.push({ ...alert, id: generateUUID() });
      }
    }

    for (let i = 0; i < sortedByTime.length; i++) {
      for (let j = i + 1; j < sortedByTime.length; j++) {
        const a = sortedByTime[i];
        const b = sortedByTime[j];
        const aEnd = getEndTime(a);
        const bStart = b.startTime;
        if (parseTimeToMinutes(bStart) >= parseTimeToMinutes(aEnd)) {
          break;
        }
        if (isTimeOverlap(a.startTime, aEnd, bStart, getEndTime(b))) {
          addAlert({
            type: 'time_overlap',
            message: `「${a.name}」与「${b.name}」时间重叠`,
            relatedNodeIds: [a.id, b.id],
            severity: 'error',
          });
        }
      }
    }

    const personTasks = new Map<string, TimelineNode[]>();
    sortedByTime.forEach(node => {
      if (node.personInCharge) {
        if (!personTasks.has(node.personInCharge)) {
          personTasks.set(node.personInCharge, []);
        }
        personTasks.get(node.personInCharge)!.push(node);
      }
    });

    personTasks.forEach((tasks, person) => {
      for (let i = 0; i < tasks.length - 1; i++) {
        const current = tasks[i];
        const next = tasks[i + 1];
        const gap = getTimeGap(getEndTime(current), next.startTime);
        if (gap < 0) {
          addAlert({
            type: 'person_overload',
            message: `「${person}」在「${current.name}」与「${next.name}」期间任务时间重叠，存在冲突`,
            relatedNodeIds: [current.id, next.id],
            severity: 'error',
          });
        } else if (gap < PERSON_GAP_THRESHOLD) {
          addAlert({
            type: 'person_overload',
            message: `「${person}」连续任务间隔仅 ${gap} 分钟，过于密集`,
            relatedNodeIds: [current.id, next.id],
            severity: 'warning',
          });
        }
      }
    });

    sortedByOrder.forEach(node => {
      if (node.status !== 'completed' && node.requiredItems.length === 0) {
        addAlert({
          type: 'items_missing',
          message: `「${node.name}」未填写所需物品`,
          relatedNodeIds: [node.id],
          severity: 'warning',
        });
      }
    });

    if (sortedByTime.length > 0) {
      const lastNode = sortedByTime[sortedByTime.length - 1];
      const lastEndMinutes = parseTimeToMinutes(lastNode.startTime) + lastNode.durationMinutes;
      const lectureStartMinutes = parseTimeToMinutes(lectureInfo.startTime);
      const bufferMinutes = lectureInfo.bufferMinutes;
      const deadlineMinutes = lectureStartMinutes - bufferMinutes;

      if (lastEndMinutes > deadlineMinutes) {
        const overMinutes = lastEndMinutes - deadlineMinutes;
        addAlert({
          type: 'end_time_exceed',
          message: `最后一项「${lastNode.name}」结束时间超出缓冲区 ${overMinutes} 分钟`,
          relatedNodeIds: [lastNode.id],
          severity: 'error',
        });
      }
    }

    const orderIds = sortedByOrder.map(n => n.id);
    const timeIds = sortedByTime.map(n => n.id);
    const orderStr = orderIds.join(',');
    const timeStr = timeIds.join(',');

    if (orderStr !== timeStr && sortedByOrder.length > 1) {
      const mismatchNodes: string[] = [];
      for (let i = 0; i < sortedByOrder.length; i++) {
        if (sortedByOrder[i].id !== sortedByTime[i].id) {
          mismatchNodes.push(sortedByOrder[i].id);
        }
      }
      if (mismatchNodes.length > 0) {
        addAlert({
          type: 'order_mismatch',
          message: '时间顺序与排列顺序不一致，建议调整',
          relatedNodeIds: mismatchNodes.slice(0, 5),
          severity: 'warning',
        });
      }
    }

    return alerts;
  });

  const hasOrderMismatch = computed(() =>
    risks.value.some(r => r.type === 'order_mismatch')
  );

  function getNodeRisks(nodeId: string): RiskAlert[] {
    return risks.value.filter(r => r.relatedNodeIds.includes(nodeId));
  }

  function hasNodeRisk(nodeId: string): boolean {
    return risks.value.some(r => r.relatedNodeIds.includes(nodeId));
  }

  function getNodeRiskSeverity(nodeId: string): 'warning' | 'error' | null {
    const nodeRisks = getNodeRisks(nodeId);
    if (nodeRisks.some(r => r.severity === 'error')) return 'error';
    if (nodeRisks.some(r => r.severity === 'warning')) return 'warning';
    return null;
  }

  return {
    risks,
    hasOrderMismatch,
    getNodeRisks,
    hasNodeRisk,
    getNodeRiskSeverity,
  };
}
