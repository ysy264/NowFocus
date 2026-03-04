/**
 * TimelineView
 *
 * 长按触发的时间轴模式：
 * - 历史任务（已划掉，灰色）在上方
 * - 当前任务（高亮）居中
 * - 未来任务（待做，正常色）在下方
 * - 整个列表随手指拖拽，松手弹回当前任务
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { Colors, Radius, Typography, Layout, SCREEN_H } from '../constants/design';
import { Goal, Task } from '../store/taskStore';

interface TimelineViewProps {
  goal: Goal;
  overlayStyle: object;
  listStyle: object;
}

interface TimelineItem {
  task: Task;
  type: 'history' | 'current' | 'future';
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  goal,
  overlayStyle,
  listStyle,
}) => {
  // 组装时间轴数据：历史（倒序展示，最近在上） + 当前 + 未来
  const items: TimelineItem[] = [
    ...goal.history.map(t => ({ task: t, type: 'history' as const })),
    ...(goal.queue[0] ? [{ task: goal.queue[0], type: 'current' as const }] : []),
    ...goal.queue.slice(1).map(t => ({ task: t, type: 'future' as const })),
  ];

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none">
      <Animated.View style={[styles.listContainer, listStyle]}>
        {items.map((item, index) => (
          <TimelineItem key={item.task.id} item={item} index={index} />
        ))}
      </Animated.View>
    </Animated.View>
  );
};

// ─── 单条时间轴条目 ───────────────────────────────────────────
const TimelineItem: React.FC<{ item: TimelineItem; index: number }> = ({
  item,
}) => {
  const isCurrent = item.type === 'current';
  const isDone    = item.type === 'history';

  return (
    <View style={[styles.item, isCurrent && styles.itemCurrent]}>
      {/* 左侧连线 + 圆点 */}
      <View style={styles.dotCol}>
        <View
          style={[
            styles.dot,
            isCurrent && styles.dotCurrent,
            isDone     && styles.dotDone,
          ]}
        />
      </View>

      {/* 任务文字 */}
      <View style={styles.textCol}>
        {isDone ? (
          <Text style={styles.doneTitle}>{item.task.title}</Text>
        ) : isCurrent ? (
          <Text style={styles.currentTitle}>{item.task.title}</Text>
        ) : (
          <Text style={styles.futureTitle}>{item.task.title}</Text>
        )}

        {item.task.snoozeCount > 0 && (
          <Text style={styles.snoozeTag}>
            推迟 {item.task.snoozeCount} 次
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(242, 242, 247, 0.92)',
    justifyContent:  'center',
    alignItems:      'center',
    paddingVertical: 80,
  },
  listContainer: {
    width: '100%',
    paddingHorizontal: 36,
  },
  item: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    minHeight:      Layout.timelineItemH,
    paddingVertical: 10,
  },
  itemCurrent: {
    // 当前任务行：稍微加宽一点来视觉区分
  },

  // 左侧时间线
  dotCol: {
    width:          24,
    alignItems:     'center',
    paddingTop:      4,
  },
  dot: {
    width:        8,
    height:       8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.separator,
  },
  dotCurrent: {
    width:           12,
    height:          12,
    backgroundColor: Colors.accentBlue,
    marginTop:       -2,
  },
  dotDone: {
    backgroundColor: Colors.textDone,
  },

  // 文字区域
  textCol: {
    flex:        1,
    marginLeft:  16,
    justifyContent: 'center',
  },
  doneTitle: {
    ...Typography.timelineItem,
    color:           Colors.textDone,
    textDecorationLine: 'line-through',
  },
  currentTitle: {
    fontSize:   20,
    fontWeight: '700',
    color:      Colors.textPrimary,
    lineHeight: 26,
  },
  futureTitle: {
    ...Typography.timelineItem,
    color: Colors.textSecondary,
  },
  snoozeTag: {
    fontSize:   11,
    color:      Colors.accentBlue,
    marginTop:   3,
  },
});
