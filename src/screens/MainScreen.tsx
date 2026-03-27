/**
 * MainScreen — Healing Capsule Flow  v2.2
 *
 * 默认视图：只显示当前激活胶囊，居中全屏，干净专注。
 *
 * 长按（400ms）→ Peek 开启/关闭（Toggle）：
 *   - 历史蓝药丸从上方淡入（已完成）
 *   - 待做胶囊从下方淡入（可点击提前到队首）
 *   - 再次长按 → 收起
 *
 * 角落按钮：
 *   右上角灰色胶囊 → 药盒（碎想 Inbox）
 *   左上角蓝色药丸 → 历史池（查看已完成列表）
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, TouchableOpacity, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { CapsuleColors, CapsuleDims, Spring, SCREEN_H } from '../constants/design';
import { useTaskStore } from '../store/taskStore';
import { CapsuleItem }    from '../components/CapsuleItem';
import { AddCapsuleSheet } from '../components/AddCapsuleSheet';
import { AddMenu }             from '../components/AddMenu';
import { CapsuleDetailCard }  from '../components/CapsuleDetailCard';


const MAX_UPCOMING = 4;
const MAX_HISTORY  = 3;

// ─── 时间格式化 ────────────────────────────────────────────────
function fmtTime(ts?: number): string {
  if (!ts) return '';
  const d   = new Date(ts);
  const now = new Date();
  const h   = d.getHours().toString().padStart(2, '0');
  const m   = d.getMinutes().toString().padStart(2, '0');
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `今天 ${h}:${m}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${h}:${m}`;
}

// ─── 主屏幕 ───────────────────────────────────────────────────
export const MainScreen: React.FC = () => {
  const [sheetVisible,   setSheetVisible]   = useState(false);
  const [inboxVisible,   setInboxVisible]   = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  // 详情模式
  const [isDetail, setIsDetail] = useState(false);

  const activeQueue            = useTaskStore(s => s.activeQueue);
  const history                = useTaskStore(s => s.history);
  const inbox                  = useTaskStore(s => s.inbox);
  const prioritizeCapsule      = useTaskStore(s => s.prioritizeCapsule);
  const completeCurrentCapsule = useTaskStore(s => s.completeCurrentCapsule);
  const snoozeCurrentCapsule   = useTaskStore(s => s.snoozeCurrentCapsule);

  const currentCapsule = activeQueue[0] ?? null;
  const upcomingSlice  = activeQueue.slice(1, 1 + MAX_UPCOMING);
  const historySlice   = history.slice(-MAX_HISTORY);   // 最近 N 条已完成
  const isEmpty        = activeQueue.length === 0;

  // ─── Peek & 详情 动画 ───────────────────────────────────────
  const peekProgress   = useSharedValue(0);
  const detailProgress = useSharedValue(0);

  const enterDetail = useCallback(() => {
    setIsDetail(true);
    peekProgress.value   = withSpring(0, Spring.snapBack);
    detailProgress.value = withSpring(1, Spring.open);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const exitDetail = useCallback(() => {
    setIsDetail(false);
    detailProgress.value = withSpring(0, Spring.snapBack);
  }, []);

  const hapticMedium = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // 长按 Toggle：专注模式（隐藏所有图标，只留激活胶囊）
  const longPress = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      if (peekProgress.value > 0.5) {
        peekProgress.value = withSpring(0, Spring.snapBack);
      } else {
        peekProgress.value = withSpring(1, Spring.open);
        runOnJS(hapticMedium)();
      }
    });

  // 专注模式 或 详情模式：图标淡出
  const uiHideStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.max(peekProgress.value, detailProgress.value),
  }));

  // 历史药丸区：专注/详情时向上飞出隐藏
  const historyAnimStyle = useAnimatedStyle(() => {
    const hide = Math.max(peekProgress.value, detailProgress.value);
    return {
      opacity:   1 - hide,
      transform: [{ translateY: -hide * 40 }],
    };
  });

  // 待做区：专注/详情时向下飞出隐藏
  const upcomingAnimStyle = useAnimatedStyle(() => {
    const hide = Math.max(peekProgress.value, detailProgress.value);
    return {
      opacity:   1 - hide,
      transform: [{ translateY: hide * 40 }],
    };
  });

  // 选择待做胶囊时：切换为该任务，同时收起（进入专注模式）
  const handlePrioritize = useCallback((id: string) => {
    prioritizeCapsule(id);
    peekProgress.value = withSpring(1, Spring.open);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [prioritizeCapsule, peekProgress]);


  // ─── 渲染 ────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={CapsuleColors.background} />

      {/* ── 长按专注模式区域：顶部图标 + 胶囊 + 待做区（不含底部按钮） ── */}
      <GestureDetector gesture={longPress}>
        <View style={styles.gestureArea}>

          {/* ── 顶部图标区（详情模式淡出） ── */}
          <Animated.View style={[StyleSheet.absoluteFill, uiHideStyle]} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() => setHistoryVisible(true)}
              activeOpacity={0.7}
            >
              <Feather name="layers" size={16} color={CapsuleColors.historyBlue} />
              <Text style={styles.historyBtnCount}>
                {history.length > 99 ? '99+' : history.length}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.inboxBtn}
              onPress={() => setInboxVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.inboxDot} />
              <Text style={styles.inboxCount}>
                {inbox.length > 99 ? '99+' : inbox.length}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ── 历史药丸区（flex:1 撑开空间，pills 靠底对齐，飞上消失） ── */}
          <Animated.View style={[styles.historySection, historyAnimStyle]} pointerEvents="none">
            {history.length > MAX_HISTORY && (
              <Text style={styles.historyOverflow}>+{history.length - MAX_HISTORY}</Text>
            )}
            {historySlice.map(cap => (
              <View key={cap.id} style={styles.historyRow}>
                <CapsuleItem variant="history" />
              </View>
            ))}
          </Animated.View>

          {/* ── 激活胶囊 ── */}
          <View style={styles.activeSection}>
            {isEmpty ? (
              <View style={styles.emptyHint}>
                <Text style={styles.emptyText}>
                  {'点击下方按钮添加第一个任务\n\n长按屏幕专注模式\n右滑完成  左滑延后'}
                </Text>
              </View>
            ) : (
              <CapsuleItem
                key={currentCapsule!.id}
                variant="active"
                title={currentCapsule?.title}
                onTap={enterDetail}
              />
            )}
          </View>

          {/* ── 待做胶囊区 ── */}
          <Animated.View
            style={[styles.upcomingSection, upcomingAnimStyle]}
            pointerEvents="box-none"
          >
            {upcomingSlice.map((cap, idx) => (
              <TouchableOpacity
                key={cap.id}
                style={styles.upcomingRow}
                onPress={() => handlePrioritize(cap.id)}
                activeOpacity={0.7}
              >
                <CapsuleItem variant="upcoming" title={cap.title} index={idx} />
              </TouchableOpacity>
            ))}
            {activeQueue.length > MAX_UPCOMING + 1 && (
              <Text style={[styles.moreText, { marginTop: 4 }]}>
                还有 {activeQueue.length - MAX_UPCOMING - 1} 个待做
              </Text>
            )}
          </Animated.View>

        </View>
      </GestureDetector>

      {/* ── 添加按钮区（在 longPress GestureDetector 外，避免手势冲突） ── */}
      <Animated.View style={[styles.addArea, uiHideStyle]}
        pointerEvents={isDetail ? 'none' : 'auto'}>
        <AddMenu
          onPressAdd={() => setSheetVisible(true)}
        />
      </Animated.View>

      {/* ── 详情卡片 ── */}
      {isDetail && currentCapsule && (
        <CapsuleDetailCard
          title={currentCapsule.title}
          onClose={exitDetail}
          onComplete={() => {
            exitDetail();
            completeCurrentCapsule();
          }}
          onSnooze={() => {
            exitDetail();
            snoozeCurrentCapsule();
          }}
        />
      )}

      {/* ── 弹层 ── */}
      <AddCapsuleSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
      <InboxSheet
        visible={inboxVisible}
        onClose={() => setInboxVisible(false)}
      />
      <HistorySheet
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
      />
    </View>
  );
};

// ─── 药盒弹层 ────────────────────────────────────────────────
const InboxSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible, onClose,
}) => {
  const inbox              = useTaskStore(s => s.inbox);
  const moveFromInboxToQueue = useTaskStore(s => s.moveFromInboxToQueue);
  const removeFromInbox    = useTaskStore(s => s.removeFromInbox);

  if (!visible) return null;
  return (
    <View style={styles.sheetOverlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>药盒  碎想备忘</Text>
        {inbox.length === 0 && (
          <Text style={styles.sheetEmpty}>药盒是空的</Text>
        )}
        <GHScrollView showsVerticalScrollIndicator={false}>
          {inbox.map(cap => (
            <View key={cap.id} style={styles.sheetRow}>
              <Text style={styles.sheetRowTitle} numberOfLines={2}>{cap.title}</Text>
              <TouchableOpacity
                style={styles.rowActionBtn}
                onPress={() => moveFromInboxToQueue(cap.id)}
              >
                <Text style={styles.rowActionText}>加入队列</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rowDeleteBtn}
                onPress={() => removeFromInbox(cap.id)}
              >
                <Text style={styles.rowDeleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </GHScrollView>
        <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose}>
          <Text style={styles.sheetCloseTxt}>关闭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── 历史池弹层 ──────────────────────────────────────────────
const HistorySheet: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible, onClose,
}) => {
  const history           = useTaskStore(s => s.history);
  const removeFromHistory = useTaskStore(s => s.removeFromHistory);
  const recycleToInbox    = useTaskStore(s => s.recycleToInbox);

  if (!visible) return null;
  return (
    <View style={styles.sheetOverlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>已完成  {history.length} 个</Text>
        {history.length === 0 && (
          <Text style={styles.sheetEmpty}>还没有完成任何任务</Text>
        )}
        <GHScrollView showsVerticalScrollIndicator={false}>
          {history.map(cap => (
            <View key={cap.id} style={styles.sheetRow}>
              <View style={styles.histDot} />
              <View style={styles.histRowContent}>
                <Text style={styles.sheetRowTitle} numberOfLines={2}>{cap.title}</Text>
                <Text style={styles.histTime}>{fmtTime(cap.completedAt)}</Text>
              </View>
              {/* 回收到药盒 */}
              <TouchableOpacity
                style={styles.rowActionBtn}
                onPress={() => recycleToInbox(cap.id)}
              >
                <Text style={styles.rowActionText}>存药盒</Text>
              </TouchableOpacity>
              {/* 永久删除 */}
              <TouchableOpacity
                style={styles.rowDeleteBtn}
                onPress={() => removeFromHistory(cap.id)}
              >
                <Text style={styles.rowDeleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </GHScrollView>
        <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose}>
          <Text style={styles.sheetCloseTxt}>关闭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── 样式 ─────────────────────────────────────────────────────
const {
  capsuleH, histPillH, stepH,
} = CapsuleDims;

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: CapsuleColors.background,
  },
  gestureArea: {
    flex: 1,
  },

  // ── 左上角：历史按钮（layers 图标 + 数字） ───────────────
  historyBtn: {
    position:      'absolute',
    left:           20,
    top:            13,
    zIndex:         20,
    flexDirection:  'row',
    alignItems:     'center',
    gap:             6,
  },
  historyBtnCount: {
    color:      CapsuleColors.historyBlue,
    fontSize:    13,
    fontWeight: '700',
    opacity:     0.85,
  },

  // ── 右上角：药盒按钮（红点 + 数字） ─────────────────────
  inboxBtn: {
    position:      'absolute',
    right:          20,
    top:            14,
    zIndex:         20,
    flexDirection:  'row',
    alignItems:     'center',
    gap:             6,
  },
  inboxDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: CapsuleColors.activeRed,
  },
  inboxCount: {
    color:      '#1A1A1A',
    fontSize:    13,
    fontWeight: '700',
    opacity:     0.7,
  },

  // ── 历史区 ────────────────────────────────────────────────
  historyOverflow: {
    color:        CapsuleColors.textMuted,
    fontSize:     11,
    fontWeight:   '500',
    marginBottom:  4,
    textAlign:    'center',
  },
  historySection: {
    flex:           1,
    justifyContent: 'flex-end',
    alignItems:     'center',
    paddingBottom:  (stepH - histPillH) / 2,
  },
  historyRow: {
    marginBottom: stepH - histPillH,
    alignItems:   'center',
  },

  // ── 激活区 ────────────────────────────────────────────────
  activeSection: {
    height:         capsuleH + 32,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // ── 待做区 ────────────────────────────────────────────────
  upcomingSection: {
    flex:           1,
    justifyContent: 'flex-start',
    alignItems:     'center',
    paddingTop:     (stepH - capsuleH) / 2,
  },
  upcomingRow: {
    marginBottom: stepH - capsuleH,
    alignItems:   'center',
  },
  peekHint: {
    color:      CapsuleColors.textMuted,
    fontSize:    11,
    marginTop:    4,
  },

  // ── 公共 ──────────────────────────────────────────────────
  moreText: {
    color:     CapsuleColors.textMuted,
    fontSize:   12,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyHint: {
    alignItems:      'center',
    paddingHorizontal: 48,
  },
  emptyText: {
    color:      CapsuleColors.textMuted,
    fontSize:    13,
    textAlign:  'center',
    lineHeight:  22,
  },

  // ── 添加按钮区 ────────────────────────────────────────────
  addArea: {
    alignItems:    'center',
    paddingBottom:  28,
    paddingTop:      8,
  },

  // ── 弹层通用 ──────────────────────────────────────────────
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent:  'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex:           50,
  },
  sheet: {
    backgroundColor:      '#FFFFFF',
    borderTopLeftRadius:   20,
    borderTopRightRadius:  20,
    paddingHorizontal:     20,
    paddingTop:            12,
    paddingBottom:         36,
    maxHeight:             SCREEN_H * 0.65,
  },
  sheetHandle: {
    width:           40,
    height:           4,
    borderRadius:     2,
    backgroundColor: '#E0E0E0',
    alignSelf:       'center',
    marginBottom:    16,
  },
  sheetTitle: {
    fontSize:     17,
    fontWeight:  '700',
    color:       '#1A1A1A',
    marginBottom: 14,
  },
  sheetEmpty: {
    color:    CapsuleColors.textMuted,
    fontSize:  14,
    paddingVertical: 12,
  },
  sheetRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:    12,
    borderBottomWidth:  1,
    borderBottomColor: '#F0F0F0',
  },
  sheetRowTitle: {
    flex:       1,
    fontSize:   14,
    color:     '#222',
    lineHeight:  20,
  },
  rowActionBtn: {
    paddingHorizontal: 10,
    paddingVertical:    5,
    backgroundColor:   CapsuleColors.activeBlue,
    borderRadius:      12,
    marginLeft:         8,
  },
  rowActionText: {
    color:     '#fff',
    fontSize:   12,
    fontWeight: '600',
  },
  rowDeleteBtn: {
    paddingHorizontal: 8,
    paddingVertical:   5,
    marginLeft:        4,
  },
  rowDeleteText: {
    color:     CapsuleColors.textMuted,
    fontSize:  14,
  },
  sheetCloseBtn: {
    marginTop:       16,
    alignItems:      'center',
    paddingVertical:  12,
    backgroundColor: '#F5F5F5',
    borderRadius:    12,
  },
  sheetCloseTxt: {
    color:     '#666',
    fontSize:  15,
    fontWeight: '500',
  },

  // ── 历史池专属 ────────────────────────────────────────────
  histDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: CapsuleColors.historyBlue,
    marginRight:     10,
    marginTop:        3,
    opacity:          0.7,
    flexShrink:       0,
  },
  histRowContent: {
    flex: 1,
  },
  histTime: {
    color:     CapsuleColors.textMuted,
    fontSize:   11,
    marginTop:   2,
  },
});
