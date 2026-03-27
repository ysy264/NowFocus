/**
 * AddMenu — 底部添加胶囊按钮
 *
 * 轻点 → 呼出文字输入框（onPressAdd）
 * 长按 → "语音输入 敬请期待" toast（下个版本实现）
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { CapsuleColors, CapsuleDims } from '../constants/design';

interface Props {
  onPressAdd: () => void;
}

const { addBtnW, addBtnH } = CapsuleDims;

export const AddMenu: React.FC<Props> = ({ onPressAdd }) => {
  const toastOpacity = useSharedValue(0);
  const btnScale     = useSharedValue(1);

  const showComingSoon = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    toastOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(1500, withTiming(0, { duration: 300 }))
    );
  }, []);

  const tap = Gesture.Tap()
    .onBegin(() => { btnScale.value = withTiming(0.93, { duration: 80 }); })
    .onFinalize(() => { btnScale.value = withTiming(1, { duration: 120 }); })
    .onEnd(() => { runOnJS(onPressAdd)(); });

  const longPress = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => { runOnJS(showComingSoon)(); });

  const composed = Gesture.Exclusive(tap, longPress);

  const btnScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
  }));

  return (
    <View style={styles.wrapper}>
      {/* Toast 提示 */}
      <Animated.View style={[styles.toast, toastStyle]} pointerEvents="none">
        <Text style={styles.toastText}>语音输入  敬请期待 🎤</Text>
      </Animated.View>

      {/* 主按钮 */}
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.addBtnShadow, btnScaleStyle]}>
          <View style={styles.addBtn}>
            <View style={[styles.addHalf, { backgroundColor: CapsuleColors.addBlack }]} />
            <View style={[styles.addHalf, { backgroundColor: CapsuleColors.addWhite }]} />
            <View style={styles.seamDot} />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems:     'center',
    justifyContent: 'center',
  },

  // Toast
  toast: {
    position:        'absolute',
    bottom:           addBtnH + 16,
    paddingHorizontal: 16,
    paddingVertical:    8,
    backgroundColor:  'rgba(30,30,30,0.82)',
    borderRadius:     20,
  },
  toastText: {
    color:     '#FFFFFF',
    fontSize:   13,
    fontWeight: '500',
  },

  // 阴影包裹层
  addBtnShadow: {
    borderRadius:  addBtnH / 2,
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius:  10,
    elevation:     6,
  },
  // 主按钮
  addBtn: {
    width:         addBtnW,
    height:        addBtnH,
    flexDirection: 'row',
    borderRadius:  addBtnH / 2,
    overflow:      'hidden',
  },
  addHalf: {
    width:  addBtnW / 2,
    height: addBtnH,
  },
  seamDot: {
    position:        'absolute',
    left:             addBtnW / 2 - 4,
    top:              addBtnH / 2 - 4,
    width:            8,
    height:           8,
    borderRadius:     4,
    backgroundColor: 'rgba(255,255,255,0.75)',
    zIndex:           2,
  },
});
