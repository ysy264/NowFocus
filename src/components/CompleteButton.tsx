/**
 * CompleteButton
 *
 * 显眼的完成按钮，点击时：
 * 1. 触觉反馈
 * 2. 打勾缩放动画
 * 3. 触发 onComplete 回调
 */

import React, { useCallback } from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Shadow, Spring } from '../constants/design';

interface CompleteButtonProps {
  onComplete: () => void;
  disabled?: boolean;
}

export const CompleteButton: React.FC<CompleteButtonProps> = ({
  onComplete,
  disabled = false,
}) => {
  const scale = useSharedValue(1);

  const handlePress = useCallback(async () => {
    if (disabled) return;
    // 触觉反馈
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // 打勾弹跳动画
    scale.value = withSequence(
      withSpring(0.88, Spring.taskSwitch),
      withSpring(1.08, Spring.taskSwitch),
      withSpring(1.0,  Spring.taskSwitch)
    );
    onComplete();
  }, [disabled, onComplete, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          disabled && styles.buttonDisabled,
        ]}
        onPress={handlePress}
        disabled={disabled}
      >
        <Text style={styles.checkmark}>✓</Text>
        <Text style={styles.label}>完成</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'center',
    backgroundColor:  Colors.accent,
    paddingHorizontal: 40,
    paddingVertical:   18,
    borderRadius:     Radius.pill,
    gap:              8,
    ...Shadow.fab,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    backgroundColor: Colors.separator,
    shadowOpacity:   0,
    elevation:       0,
  },
  checkmark: {
    fontSize:   20,
    color:      '#fff',
    fontWeight: '700',
  },
  label: {
    fontSize:   17,
    fontWeight: '600',
    color:      '#fff',
    letterSpacing: 0.4,
  },
});
