import { ref, reactive, computed, provide, inject } from 'vue';
import type { TimelineNode, LectureInfo, NodeStatus } from '@/types';
import { generateUUID } from '@/utils/uuid';
import { addMinutesToTime, getEndTime } from '@/utils/timeUtils';

const TIMELINE_SYMBOL = Symbol();

export function createTimelineStore() {
  const lectureInfo = reactive<LectureInfo>({
    name: '2024年度技术分享讲座',
    startTime: '14:00',
    bufferMinutes: 30,
  });

  const reviewNotes = ref(localStorage.getItem('lecture-review-notes') || '');
  const handledRiskKeys = ref<Set<string>>(new Set());

  const timelineNodes = ref<TimelineNode[]>([
    {
      id: generateUUID(),
      name: '会场布置检查',
      startTime: '09:00',
      durationMinutes: 60,
      personInCharge: '张三',
      requiredItems: ['投影仪', '麦克风', '座椅'],
      status: 'completed',
      notes: '确认音响设备正常',
      sortOrder: 0,
    },
    {
      id: generateUUID(),
      name: '嘉宾接待准备',
      startTime: '10:00',
      durationMinutes: 45,
      personInCharge: '李四',
      requiredItems: ['名牌', '茶水', '资料袋'],
      status: 'completed',
      notes: '',
      sortOrder: 1,
    },
    {
      id: generateUUID(),
      name: '媒体签到',
      startTime: '12:30',
      durationMinutes: 60,
      personInCharge: '王五',
      requiredItems: ['签到表', '采访证'],
      status: 'in_preparation',
      notes: '主入口左侧',
      sortOrder: 2,
    },
    {
      id: generateUUID(),
      name: '听众入场引导',
      startTime: '13:00',
      durationMinutes: 45,
      personInCharge: '赵六',
      requiredItems: ['指示牌', '扫码器'],
      status: 'not_started',
      notes: '',
      sortOrder: 3,
    },
    {
      id: generateUUID(),
      name: '嘉宾休息室服务',
      startTime: '13:15',
      durationMinutes: 30,
      personInCharge: '李四',
      requiredItems: [],
      status: 'not_started',
      notes: 'VIP休息室',
      sortOrder: 4,
    },
    {
      id: generateUUID(),
      name: '开场前设备最终检查',
      startTime: '13:30',
      durationMinutes: 15,
      personInCharge: '张三',
      requiredItems: ['备用话筒', '激光笔'],
      status: 'not_started',
      notes: '',
      sortOrder: 5,
    },
  ]);

  const expandedNodeIds = ref<Set<string>>(new Set());

  const allPersons = computed(() => {
    const persons = new Set<string>();
    timelineNodes.value.forEach(node => {
      if (node.personInCharge) {
        persons.add(node.personInCharge);
      }
    });
    return Array.from(persons).sort();
  });

  const sortedNodes = computed(() => {
    return [...timelineNodes.value].sort((a, b) => a.sortOrder - b.sortOrder);
  });

  function addNode(afterNodeId?: string) {
    const newSortOrder = afterNodeId
      ? (timelineNodes.value.find(n => n.id === afterNodeId)?.sortOrder ?? 0) + 1
      : timelineNodes.value.length;

    timelineNodes.value.forEach(node => {
      if (node.sortOrder >= newSortOrder) {
        node.sortOrder++;
      }
    });

    let startTime = '09:00';
    if (afterNodeId) {
      const prevNode = timelineNodes.value.find(n => n.id === afterNodeId);
      if (prevNode) {
        startTime = getEndTime(prevNode);
      }
    }

    const newNode: TimelineNode = {
      id: generateUUID(),
      name: '新事项',
      startTime,
      durationMinutes: 30,
      personInCharge: '',
      requiredItems: [],
      status: 'not_started',
      notes: '',
      sortOrder: newSortOrder,
    };

    timelineNodes.value.push(newNode);
    expandedNodeIds.value.add(newNode.id);
  }

  function duplicateLastNode() {
    const lastNode = [...timelineNodes.value].sort((a, b) => b.sortOrder - a.sortOrder)[0];
    if (!lastNode) {
      addNode();
      return;
    }

    const newSortOrder = lastNode.sortOrder + 1;
    const startTime = getEndTime(lastNode);

    const newNode: TimelineNode = {
      id: generateUUID(),
      name: lastNode.name + ' (副本)',
      startTime,
      durationMinutes: lastNode.durationMinutes,
      personInCharge: lastNode.personInCharge,
      requiredItems: [...lastNode.requiredItems],
      status: 'not_started',
      notes: lastNode.notes,
      sortOrder: newSortOrder,
    };

    timelineNodes.value.push(newNode);
    expandedNodeIds.value.add(newNode.id);
  }

  function updateNode(id: string, updates: Partial<TimelineNode>) {
    const node = timelineNodes.value.find(n => n.id === id);
    if (node) {
      Object.assign(node, updates);
    }
  }

  function deleteNode(id: string) {
    const index = timelineNodes.value.findIndex(n => n.id === id);
    if (index > -1) {
      const deletedOrder = timelineNodes.value[index].sortOrder;
      timelineNodes.value.splice(index, 1);
      timelineNodes.value.forEach(node => {
        if (node.sortOrder > deletedOrder) {
          node.sortOrder--;
        }
      });
      expandedNodeIds.value.delete(id);
    }
  }

  function updateNodeStatus(id: string, status: NodeStatus) {
    const node = timelineNodes.value.find(n => n.id === id);
    if (node) {
      node.status = status;
    }
  }

  function toggleNodeExpanded(id: string) {
    if (expandedNodeIds.value.has(id)) {
      expandedNodeIds.value.delete(id);
    } else {
      expandedNodeIds.value.add(id);
    }
  }

  function isNodeExpanded(id: string) {
    return expandedNodeIds.value.has(id);
  }

  function updateSortOrder(nodes: TimelineNode[]) {
    nodes.forEach((node, index) => {
      const originalNode = timelineNodes.value.find(n => n.id === node.id);
      if (originalNode) {
        originalNode.sortOrder = index;
      }
    });
  }

  function batchUpdateStatus(ids: string[], status: NodeStatus) {
    ids.forEach(id => {
      updateNodeStatus(id, status);
    });
  }

  function addItemToNode(nodeId: string, item: string) {
    const node = timelineNodes.value.find(n => n.id === nodeId);
    if (node && item.trim() && !node.requiredItems.includes(item.trim())) {
      node.requiredItems.push(item.trim());
    }
  }

  function removeItemFromNode(nodeId: string, item: string) {
    const node = timelineNodes.value.find(n => n.id === nodeId);
    if (node) {
      const index = node.requiredItems.indexOf(item);
      if (index > -1) {
        node.requiredItems.splice(index, 1);
      }
    }
  }

  function shiftTimeFromNode(nodeId: string, deltaMinutes: number) {
    const sorted = sortedNodes.value;
    const startIndex = sorted.findIndex(n => n.id === nodeId);
    if (startIndex === -1) return;

    for (let i = startIndex; i < sorted.length; i++) {
      const node = sorted[i];
      node.startTime = addMinutesToTime(node.startTime, deltaMinutes);
    }
  }

  function toggleRiskHandled(riskKey: string) {
    if (handledRiskKeys.value.has(riskKey)) {
      handledRiskKeys.value.delete(riskKey);
    } else {
      handledRiskKeys.value.add(riskKey);
    }
  }

  function isRiskHandled(riskKey: string): boolean {
    return handledRiskKeys.value.has(riskKey);
  }

  function pruneHandledRiskKeys(activeKeys: string[]) {
    const activeKeySet = new Set(activeKeys);
    handledRiskKeys.value = new Set(
      Array.from(handledRiskKeys.value).filter(key => activeKeySet.has(key))
    );
  }

  function setReviewNotes(notes: string) {
    reviewNotes.value = notes;
    localStorage.setItem('lecture-review-notes', notes);
  }

  return {
    lectureInfo,
    timelineNodes,
    sortedNodes,
    allPersons,
    expandedNodeIds,
    reviewNotes,
    handledRiskKeys,
    addNode,
    duplicateLastNode,
    updateNode,
    deleteNode,
    updateNodeStatus,
    toggleNodeExpanded,
    isNodeExpanded,
    updateSortOrder,
    batchUpdateStatus,
    addItemToNode,
    removeItemFromNode,
    shiftTimeFromNode,
    toggleRiskHandled,
    isRiskHandled,
    pruneHandledRiskKeys,
    setReviewNotes,
  };
}

export type TimelineStore = ReturnType<typeof createTimelineStore>;

export function provideTimelineStore(store: TimelineStore) {
  provide(TIMELINE_SYMBOL, store);
}

export function useTimelineStore(): TimelineStore {
  const store = inject<TimelineStore>(TIMELINE_SYMBOL);
  if (!store) {
    throw new Error('Timeline store not provided');
  }
  return store;
}
