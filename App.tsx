/**
 * App.tsx — 根入口
 *
 * 职责：
 * 1. 包裹 GestureHandlerRootView（Gesture Handler 必须）
 * 2. 包裹 SafeAreaProvider
 * 3. 渲染主屏幕
 */

import 'react-native-gesture-handler'; // 必须是第一行 import
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MainScreen } from './src/screens/MainScreen';
import { CapsuleColors } from './src/constants/design';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <StatusBar style="dark" backgroundColor={CapsuleColors.background} />
          <MainScreen />
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex:            1,
    backgroundColor: CapsuleColors.background,
  },
});
