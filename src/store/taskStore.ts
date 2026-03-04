import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── 类型 ─────────────────────────────────────────────────────
export interface Capsule {
  id: string;
  title: string;
  snoozeCount: number;
  createdAt: number;
  completedAt?: number;
}

interface CapsuleStore {
  inbox:       Capsule[];
  activeQueue: Capsule[];
  history:     Capsule[];

  getCurrentCapsule:      () => Capsule | null;

  // 队列操作
  completeCurrentCapsule: () => void;
  snoozeCurrentCapsule:   () => void;
  /**
   * 加入队列：
   *   - 队列为空 → 直接成为激活胶囊
   *   - 队列非空 → 插入到位置 1（当前任务之后，立刻成为"下一个"）
   */
  addToQueue:             (title: string) => void;
  /**
   * 将任意待做胶囊移到队首（成为当前激活）
   */
  prioritizeCapsule:      (id: string)    => void;

  // 药盒操作
  addToInbox:             (title: string) => void;
  moveFromInboxToQueue:   (id: string)    => void;
  removeFromInbox:        (id: string)    => void;

  // 历史操作
  removeFromHistory:      (id: string)    => void;  // 永久删除
  recycleToInbox:         (id: string)    => void;  // 从历史移回药盒
}

// ─── 工具 ─────────────────────────────────────────────────────
const uid = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const makeCapsule = (title: string): Capsule => ({
  id:          uid(),
  title:       title.trim(),
  snoozeCount: 0,
  createdAt:   Date.now(),
});

// ─── Store ────────────────────────────────────────────────────
export const useTaskStore = create<CapsuleStore>()(
  persist(
    (set, get) => ({
      // 全部从空白开始，不预置 Mock 数据
      inbox:       [],
      activeQueue: [],
      history:     [],

      getCurrentCapsule: () => get().activeQueue[0] ?? null,

      completeCurrentCapsule: () =>
        set(state => {
          if (state.activeQueue.length === 0) return state;
          const [done, ...rest] = state.activeQueue;
          return {
            activeQueue: rest,
            history:     [{ ...done, completedAt: Date.now() }, ...state.history],
          };
        }),

      snoozeCurrentCapsule: () =>
        set(state => {
          if (state.activeQueue.length <= 1) return state;
          const [current, ...rest] = state.activeQueue;
          return {
            activeQueue: [
              ...rest,
              { ...current, snoozeCount: current.snoozeCount + 1 },
            ],
          };
        }),

      addToQueue: (title: string) =>
        set(state => {
          const newCap = makeCapsule(title);
          if (state.activeQueue.length === 0) {
            // 队列空 → 直接激活
            return { activeQueue: [newCap] };
          }
          // 队列非空 → 插入到位置 1（紧跟在当前任务之后）
          const [current, ...rest] = state.activeQueue;
          return { activeQueue: [current, newCap, ...rest] };
        }),

      prioritizeCapsule: (id: string) =>
        set(state => {
          const target = state.activeQueue.find(c => c.id === id);
          // 已经是队首，或不存在
          if (!target || state.activeQueue[0]?.id === id) return state;
          return {
            activeQueue: [
              target,
              ...state.activeQueue.filter(c => c.id !== id),
            ],
          };
        }),

      addToInbox: (title: string) =>
        set(state => ({
          inbox: [makeCapsule(title), ...state.inbox],
        })),

      moveFromInboxToQueue: (id: string) =>
        set(state => {
          const capsule = state.inbox.find(c => c.id === id);
          if (!capsule) return state;
          const cleaned = state.inbox.filter(c => c.id !== id);
          if (state.activeQueue.length === 0) {
            return { inbox: cleaned, activeQueue: [capsule] };
          }
          // 插入到位置 1
          const [current, ...rest] = state.activeQueue;
          return {
            inbox:       cleaned,
            activeQueue: [current, capsule, ...rest],
          };
        }),

      removeFromInbox: (id: string) =>
        set(state => ({
          inbox: state.inbox.filter(c => c.id !== id),
        })),

      removeFromHistory: (id: string) =>
        set(state => ({
          history: state.history.filter(c => c.id !== id),
        })),

      recycleToInbox: (id: string) =>
        set(state => {
          const capsule = state.history.find(c => c.id === id);
          if (!capsule) return state;
          // 重置完成时间，以碎想形式放入药盒
          const { completedAt: _, ...rest } = capsule;
          return {
            history: state.history.filter(c => c.id !== id),
            inbox:   [{ ...rest, snoozeCount: 0 }, ...state.inbox],
          };
        }),
    }),
    {
      name:    'nowfocus-capsules',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
