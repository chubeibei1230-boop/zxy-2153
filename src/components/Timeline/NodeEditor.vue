<script setup lang="ts">
import { ref, watch } from 'vue';
import { User, Clock, Package, StickyNote, Trash2, Plus, X } from 'lucide-vue-next';
import type { TimelineNode, NodeStatus } from '@/types';
import { STATUS_LABELS } from '@/types';
import TimeInput from '@/components/common/TimeInput.vue';
import { useTimelineStore } from '@/composables/useTimeline';

const props = defineProps<{
  node: TimelineNode;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'delete'): void;
}>();

const store = useTimelineStore();
const newItem = ref('');

const statusOptions: { value: NodeStatus; label: string }[] = [
  { value: 'not_started', label: STATUS_LABELS.not_started },
  { value: 'in_preparation', label: STATUS_LABELS.in_preparation },
  { value: 'completed', label: STATUS_LABELS.completed },
  { value: 'delayed', label: STATUS_LABELS.delayed },
];

function updateField<K extends keyof TimelineNode>(field: K, value: TimelineNode[K]) {
  store.updateNode(props.node.id, { [field]: value });
}

function handleAddItem() {
  if (newItem.value.trim()) {
    store.addItemToNode(props.node.id, newItem.value);
    newItem.value = '';
  }
}

function handleRemoveItem(item: string) {
  store.removeItemFromNode(props.node.id, item);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleAddItem();
  }
}

watch(() => props.node.startTime, () => {});
</script>

<template>
  <div class="p-4 pt-0 border-t border-slate-100 mt-3">
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <label class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <Clock :size="14" />
          事项名称
        </label>
        <input
          :value="node.name"
          class="input"
          placeholder="请输入事项名称"
          @input="(e) => updateField('name', (e.target as HTMLInputElement).value)"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-2">
          <label class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Clock :size="14" />
            开始时间
          </label>
          <TimeInput v-model="node.startTime" />
        </div>
        <div class="space-y-2">
          <label class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Clock :size="14" />
            预计分钟
          </label>
          <input
            :value="node.durationMinutes"
            type="number"
            min="1"
            max="480"
            class="input"
            @input="(e) => updateField('durationMinutes', Number((e.target as HTMLInputElement).value))"
          />
        </div>
      </div>

      <div class="space-y-2">
        <label class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <User :size="14" />
          负责人
        </label>
        <input
          :value="node.personInCharge"
          class="input"
          placeholder="请输入负责人姓名"
          list="persons-list"
          @input="(e) => updateField('personInCharge', (e.target as HTMLInputElement).value)"
        />
        <datalist id="persons-list">
          <option v-for="(p, idx) in store.allPersons" :key="idx" :value="p" />
        </datalist>
      </div>

      <div class="space-y-2">
        <label class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <Clock :size="14" />
          当前状态
        </label>
        <select
          :value="node.status"
          class="select"
          @change="(e) => updateField('status', (e.target as HTMLSelectElement).value as NodeStatus)"
        >
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <div class="space-y-2 col-span-2">
        <label class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <Package :size="14" />
          所需物品
        </label>
        <div class="flex flex-wrap gap-2 mb-2">
          <span
            v-for="item in node.requiredItems"
            :key="item"
            class="tag bg-slate-100 text-slate-700 gap-1"
          >
            {{ item }}
            <button
              class="hover:text-red-600 transition-colors p-0.5 -mr-1"
              @click="handleRemoveItem(item)"
            >
              <X :size="12" />
            </button>
          </span>
        </div>
        <div class="flex gap-2">
          <input
            v-model="newItem"
            class="input flex-1"
            placeholder="输入物品名称，按回车添加"
            @keydown="handleKeydown"
          />
          <button class="btn btn-secondary" @click="handleAddItem">
            <Plus :size="16" />
          </button>
        </div>
      </div>

      <div class="space-y-2 col-span-2">
        <label class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <StickyNote :size="14" />
          备注
        </label>
        <textarea
          :value="node.notes"
          class="input min-h-[60px] resize-y"
          placeholder="输入备注信息..."
          @input="(e) => updateField('notes', (e.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>

    <div class="flex justify-end mt-4 pt-3 border-t border-slate-100">
      <button class="btn btn-danger gap-1.5" @click="emit('delete')">
        <Trash2 :size="16" />
        删除此节点
      </button>
    </div>
  </div>
</template>
