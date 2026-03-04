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
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { CapsuleColors, CapsuleDims, Spring, SCREEN_W, SCREEN_H } from '../constants/design';
import { useTaskStore } from '../store/taskStore';
import { CapsuleItem }    from '../components/CapsuleItem';
import { AddCapsuleSheet } from '../components/AddCapsuleSheet';

const MAX_HISTORY  = 3;
const MAX_UPCOMING = 4;

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
  // JS 侧的 peek 状态——用于控制 upcoming 区域的 pointerEvents
  const [isPeeking, setIsPeeking] = useState(false);

  const activeQueue       = useTaskStore(s => s.activeQueue);
  const history           = useTaskStore(s => s.history);
  const inbox             = useTaskStore(s => s.inbox);
  const prioritizeCapsule = useTaskStore(s => s.prioritizeCapsule);

  const currentCapsule = activeQueue[0] ?? null;
  const upcomingSlice  = activeQueue.slice(1, 1 + MAX_UPCOMING);
  const historySlice   = history.slice(0, MAX_HISTORY);
  const isEmpty        = activeQueue.length === 0;

  // ─── Peek 动画 ──────────────────────────────────────────────
  const peekProgress = useSharedValue(0);

  const openPeek = useCallback(() => {
    setIsPeeking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const closePeek = useCallback(() => {
    setIsPeeking(false);
  }, []);

  // 长按 Toggle：按一次开，再按一次关
  const longPress = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      const isOpen = peekProgress.value > 0.5;
      if (isOpen) {
        peekProgress.value = withSpring(0, Spring.snapBack);
        runOnJS(closePeek)();
      } else {
        peekProgress.value = withSpring(1, Spring.open);
        runOnJS(openPeek)();
      }
    });

  const historyAnimStyle = useAnimatedStyle(() => ({
    opacity:   peekProgress.value,
    transform: [{ translateY: (1 - peekProgress.value) * -20 }],
  }));

  const upcomingAnimStyle = useAnimatedStyle(() => ({
    opacity:   peekProgress.value,
    transform: [{ translateY: (1 - peekProgress.value) * 20 }],
  }));

  // ─── 提前某个待做项 ─────────────────────────────────────────
  const handlePrioritize = useCallback((id: string) => {
    prioritizeCapsule(id);
    // 关闭 peek
    setIsPeeking(false);
    peekProgress.value = withSpring(0, Spring.snapBack);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [prioritizeCapsule, peekProgress]);

  // ─── 渲染 ────────────────────────────────────────────────────
  return (
    <GestureDetector gesture={longPress}>
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={CapsuleColors.background} />

        {/* ── 左上角：历史池按钮 ── */}
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => setHistoryVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.historyBtnPill}>
            <Text style={styles.historyBtnCount}>
              {history.length > 99 ? '99+' : history.length}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── 右上角：药盒按钮 ── */}
        <TouchableOpacity
          style={styles.inboxBtn}
          onPress={() => setInboxVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.inboxCapsule}>
            <View style={[styles.cornerHalf, { backgroundColor: CapsuleColors.inboxGray }]} />
            <View style={[styles.cornerHalf, { backgroundColor: CapsuleColors.inboxGray, opacity: 0.45 }]} />
          </View>
          {inbox.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{inbox.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── 历史蓝药丸区（长按淡入，底部对齐） ── */}
        <Animated.View
          style={[styles.historySection, historyAnimStyle]}
          pointerEvents="none"
        >
          {history.length > MAX_HISTORY && (
            <Text style={styles.moreText}>+{history.length - MAX_HISTORY}</Text>
          )}
          {historySlice.map(cap => (
            <View key={cap.id} style={styles.historyRow}>
              <CapsuleItem variant="history" />
            </View>
          ))}
        </Animated.View>

        {/* ── 激活胶囊（常驻，竖向居中） ── */}
        <View style={styles.activeSection}>
          {isEmpty ? (
            <View style={styles.emptyHint}>
              <Text style={styles.emptyText}>
                {'点击下方按钮添加第一个任务\n\n长按屏幕可查看队列\n右滑完成  左滑延后'}
              </Text>
            </View>
          ) : (
            <CapsuleItem
              key={currentCapsule!.id}
              variant="active"
              title={currentCapsule?.title}
            />
          )}
        </View>

        {/* ── 待做胶囊区（长按淡入，顶部对齐，可点击提前） ── */}
        <Animated.View
          style={[styles.upcomingSection, upcomingAnimStyle]}
          pointerEvents={isPeeking ? 'box-none' : 'none'}
        >
          {upcomingSlice.map(cap => (
            <TouchableOpacity
              key={cap.id}
              style={styles.upcomingRow}
              onPress={() => handlePrioritize(cap.id)}
              activeOpacity={0.7}
            >
              <CapsuleItem variant="upcoming" title={cap.title} />
            </TouchableOpacity>
          ))}
          {activeQueue.length > MAX_UPCOMING + 1 && (
            <Text style={[styles.moreText, { marginTop: 4 }]}>
              还有 {activeQueue.length - MAX_UPCOMING - 1} 个待做
            </Text>
          )}
          {isPeeking && upcomingSlice.length > 0 && (
            <Text style={styles.peekHint}>点击可提前至下一个</Text>
          )}
        </Animated.View>

        {/* ── 黑白添加按钮（底部常驻） ── */}
        <View style={styles.addArea}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setSheetVisible(true)}
            activeOpacity={0.78}
          >
            <View style={[styles.addHalf, { backgroundColor: CapsuleColors.addBlack }]}>
              <Text style={styles.addPlus}>+</Text>
            </View>
            <View style={[styles.addHalf, { backgroundColor: CapsuleColors.addWhite }]}>
              <Text style={styles.addLabel}>添加</Text>
            </View>
          </TouchableOpacity>
        </View>

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
    </GestureDetector>
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
        <ScrollView showsVerticalScrollIndicator={false}>
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
        </ScrollView>
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
        <ScrollView showsVerticalScrollIndicator={false}>
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
        </ScrollView>
        <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose}>
          <Text style={styles.sheetCloseTxt}>关闭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── 样式 ─────────────────────────────────────────────────────
const {
  capsuleH, upcomingH, histPillH, stepH,
  addBtnW, addBtnH,
} = CapsuleDims;

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: CapsuleColors.background,
  },

  // ── 左上角：历史按钮 ─────────────────────────────────────
  historyBtn: {
    position: 'absolute',
    left:      20,
    top:       14,
    zIndex:    20,
  },
  historyBtnPill: {
    minWidth:        44,
    height:           22,
    borderRadius:     11,
    backgroundColor: CapsuleColors.historyBlue,
    opacity:          0.75,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 8,
  },
  historyBtnCount: {
    color:     '#fff',
    fontSize:   11,
    fontWeight: '700',
  },

  // ── 右上角：药盒按钮 ─────────────────────────────────────
  inboxBtn: {
    position: 'absolute',
    right:     20,
    top:       14,
    zIndex:    20,
  },
  inboxCapsule: {
    width:         44,
    height:        22,
    flexDirection: 'row',
    borderRadius:  11,
    overflow:      'hidden',
  },
  cornerHalf: {
    flex:   1,
    height: 22,
  },
  badge: {
    position:        'absolute',
    top:             -5,
    right:           -6,
    minWidth:         16,
    height:           16,
    borderRadius:      8,
    backgroundColor: CapsuleColors.activeRed,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color:     '#fff',
    fontSize:   10,
    fontWeight: '700',
  },

  // ── 历史区 ────────────────────────────────────────────────
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
    paddingTop:     (stepH - upcomingH) / 2,
  },
  upcomingRow: {
    marginBottom: stepH - upcomingH,
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

  // ── 添加按钮 ──────────────────────────────────────────────
  addArea: {
    alignItems:    'center',
    paddingBottom:  28,
    paddingTop:      8,
  },
  addBtn: {
    width:         addBtnW,
    height:        addBtnH,
    flexDirection: 'row',
    borderRadius:  addBtnH / 2,
    overflow:      'hidden',
  },
  addHalf: {
    width:          addBtnW / 2,
    height:         addBtnH,
    alignItems:     'center',
    justifyContent: 'center',
  },
  addPlus: {
    color:      '#FFFFFF',
    fontSize:    22,
    lineHeight:  28,
  },
  addLabel: {
    color:      CapsuleColors.addBlack,
    fontSize:   14,
    fontWeight: '600',
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
