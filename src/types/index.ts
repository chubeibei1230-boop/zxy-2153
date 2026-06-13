export type NodeStatus = 'not_started' | 'in_preparation' | 'completed' | 'delayed';

export type RiskType = 'time_overlap' | 'person_overload' | 'items_missing' | 'end_time_exceed' | 'order_mismatch';

export interface TimelineNode {
  id: string;
  name: string;
  startTime: string;
  durationMinutes: number;
  personInCharge: string;
  requiredItems: string[];
  status: NodeStatus;
  notes: string;
  sortOrder: number;
}

export interface LectureInfo {
  name: string;
  startTime: string;
  bufferMinutes: number;
}

export interface RiskAlert {
  id: string;
  type: RiskType;
  message: string;
  relatedNodeIds: string[];
  severity: 'warning' | 'error';
}

export interface FilterState {
  persons: string[];
  statuses: NodeStatus[];
  timeRangeStart: string;
  timeRangeEnd: string;
  hasAlertsOnly: boolean;
}

export interface BatchOperation {
  selectedIds: string[];
  targetStatus: NodeStatus | null;
}

export const STATUS_LABELS: Record<NodeStatus, string> = {
  not_started: '未开始',
  in_preparation: '准备中',
  completed: '已完成',
  delayed: '需延后',
};

export const STATUS_COLORS: Record<NodeStatus, string> = {
  not_started: 'bg-status-not_started',
  in_preparation: 'bg-status-in_preparation',
  completed: 'bg-status-completed',
  delayed: 'bg-status-delayed',
};

export const RISK_TYPE_LABELS: Record<RiskType, string> = {
  time_overlap: '时间重叠',
  person_overload: '人员过载',
  items_missing: '物品缺失',
  end_time_exceed: '超时风险',
  order_mismatch: '顺序不一致',
};
