/**
 * FloatingAddButton
 *
 * 全局悬浮"+"按钮（FAB）
 * 点击展开 AddTaskSheet
 */

import React, { useCallback } from 'react';
import { StyleSheet, Pressable, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Shadow, Layout, Spring } from '../constants/design';

interface FloatingAddButtonProps {
  onPress: () => void;
  visible?: boolean;
}

export const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({
  onPress,
  visible = true,
}) => {
  const scale   = useSharedValue(visible ? 1 : 0);
  const opacity = useSharedValue(visible ? 1 : 0);

  React.useEffect(() => {
    scale.value   = withSpring(visible ? 1 : 0, Spring.cardEnter);
    opacity.value = withSpring(visible ? 1 : 0, Spring.cardEnter);
  }, [visible, scale, opacity]);

  const handlePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
        onPress={handlePress}
        accessibilityLabel="添加新目标"
        accessibilityRole="button"
      >
        <Text style={styles.plus}>+</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom:   Layout.fabBottom,
    right:    Layout.fabRight,
    zIndex:   100,
  },
  fab: {
    width:           Layout.fabSize,
    height:          Layout.fabSize,
    borderRadius:    Radius.pill,
    backgroundColor: Colors.textPrimary,
    alignItems:      'center',
    justifyContent:  'center',
    ...Shadow.fab,
  },
  fabPressed: {
    opacity: 0.8,
  },
  plus: {
    fontSize:   28,
    color:      '#fff',
    fontWeight: '300',
    lineHeight: 32,
    marginTop:  -1,
  },
});
