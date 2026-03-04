/**
 * AddTaskSheet
 *
 * 录入任务的底部弹层：
 * 1. 输入目标名
 * 2. 选择模式（AI 拆解 / 手动录入 / 今日聚焦）
 * 3. AI 模式：调用 decomposeGoal，展示拆解结果供确认
 *    手动模式：逐行输入子任务（回车换行）
 * 4. 确认后写入 Zustand Store
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Radius, Shadow, Typography, Spring, SCREEN_H } from '../constants/design';
import { useTaskStore, TaskMode } from '../store/taskStore';
import { decomposeGoal, AIServiceError } from '../services/aiService';

interface AddTaskSheetProps {
  visible: boolean;
  onClose: () => void;
}

type Step = 'input_goal' | 'input_tasks' | 'ai_loading' | 'ai_confirm';

export const AddTaskSheet: React.FC<AddTaskSheetProps> = ({ visible, onClose }) => {
  const addGoal = useTaskStore(s => s.addGoal);

  const [step,        setStep]        = useState<Step>('input_goal');
  const [mode,        setMode]        = useState<TaskMode>('ai_chain');
  const [goalTitle,   setGoalTitle]   = useState('');
  const [manualInput, setManualInput] = useState('');  // 每行一个任务
  const [aiTasks,     setAiTasks]     = useState<string[]>([]);
  const [aiError,     setAiError]     = useState('');

  const goalInputRef   = useRef<TextInput>(null);
  const manualInputRef = useRef<TextInput>(null);

  // ─── 动画：底部弹出 ───────────────────────────────────────
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      translateY.value     = withSpring(0, Spring.cardEnter);
      backdropOpacity.value = withTiming(1, { duration: 250 });
      // 延迟聚焦，等动画完成
      setTimeout(() => goalInputRef.current?.focus(), 320);
    } else {
      translateY.value      = withTiming(SCREEN_H, { duration: 300 });
      backdropOpacity.value  = withTiming(0, { duration: 250 });
      // 重置状态
      setTimeout(resetState, 350);
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // ─── 重置 ────────────────────────────────────────────────
  const resetState = useCallback(() => {
    setStep('input_goal');
    setGoalTitle('');
    setManualInput('');
    setAiTasks([]);
    setAiError('');
  }, []);

  // ─── 步骤 1：确认目标，进入下一步 ────────────────────────
  const handleGoalSubmit = useCallback(() => {
    if (!goalTitle.trim()) return;

    if (mode === 'ai_chain') {
      handleAIDecompose();
    } else {
      setStep('input_tasks');
      setTimeout(() => manualInputRef.current?.focus(), 100);
    }
  }, [goalTitle, mode]);

  // ─── AI 拆解 ─────────────────────────────────────────────
  const handleAIDecompose = useCallback(async () => {
    setStep('ai_loading');
    setAiError('');
    try {
      const result = await decomposeGoal(goalTitle);
      setAiTasks(result.tasks);
      setStep('ai_confirm');
    } catch (err) {
      const msg = err instanceof AIServiceError ? err.message : '未知错误，请重试';
      setAiError(msg);
      setStep('input_goal');
      Alert.alert('AI 拆解失败', msg);
    }
  }, [goalTitle]);

  // ─── 最终提交 ────────────────────────────────────────────
  const handleSubmit = useCallback((tasks: string[]) => {
    if (tasks.length === 0) return;
    addGoal(goalTitle.trim(), mode, tasks);
    onClose();
  }, [goalTitle, mode, addGoal, onClose]);

  const handleManualSubmit = useCallback(() => {
    const tasks = manualInput
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    if (tasks.length === 0) return;
    handleSubmit(tasks);
  }, [manualInput, handleSubmit]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* 背景蒙层 */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* 弹层主体 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kvContainer}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, sheetStyle]}>
          {/* 拖拽把手 */}
          <View style={styles.handle} />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── 步骤 1：输入目标 ── */}
            {(step === 'input_goal' || step === 'ai_loading') && (
              <View>
                <Text style={styles.sheetTitle}>新建目标</Text>

                {/* 模式选择 */}
                <View style={styles.modeRow}>
                  {([
                    ['ai_chain',     'AI 拆解'],
                    ['manual_chain', '手动'],
                    ['daily_focus',  '今日聚焦'],
                  ] as [TaskMode, string][]).map(([m, label]) => (
                    <Pressable
                      key={m}
                      style={[styles.modeChip, mode === m && styles.modeChipActive]}
                      onPress={() => setMode(m)}
                    >
                      <Text style={[styles.modeChipText, mode === m && styles.modeChipTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  ref={goalInputRef}
                  style={styles.goalInput}
                  placeholder={
                    mode === 'daily_focus'
                      ? '今天要专注什么？'
                      : '你的目标是什么？'
                  }
                  placeholderTextColor={Colors.separator}
                  value={goalTitle}
                  onChangeText={setGoalTitle}
                  onSubmitEditing={handleGoalSubmit}
                  returnKeyType="go"
                  autoCapitalize="none"
                  editable={step !== 'ai_loading'}
                />

                {step === 'ai_loading' ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={Colors.accentBlue} />
                    <Text style={styles.loadingText}>AI 正在拆解任务…</Text>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.submitBtn, !goalTitle.trim() && styles.submitBtnDisabled]}
                    onPress={handleGoalSubmit}
                    disabled={!goalTitle.trim()}
                  >
                    <Text style={styles.submitBtnText}>
                      {mode === 'ai_chain' ? '✦  AI 智能拆解' : '继续 →'}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* ── 步骤 2：手动录入子任务 ── */}
            {step === 'input_tasks' && (
              <View>
                <Text style={styles.sheetTitle}>{goalTitle}</Text>
                <Text style={styles.sheetSubtitle}>
                  每行一个子任务，按回车换行
                </Text>

                <TextInput
                  ref={manualInputRef}
                  style={styles.manualInput}
                  placeholder={'看第一章\n做课后题\n整理错题…'}
                  placeholderTextColor={Colors.separator}
                  value={manualInput}
                  onChangeText={setManualInput}
                  multiline
                  autoCapitalize="none"
                />

                <Pressable
                  style={[
                    styles.submitBtn,
                    manualInput.trim().length === 0 && styles.submitBtnDisabled,
                  ]}
                  onPress={handleManualSubmit}
                  disabled={manualInput.trim().length === 0}
                >
                  <Text style={styles.submitBtnText}>开始专注 →</Text>
                </Pressable>
              </View>
            )}

            {/* ── 步骤 3：AI 拆解结果确认 ── */}
            {step === 'ai_confirm' && (
              <View>
                <Text style={styles.sheetTitle}>{goalTitle}</Text>
                <Text style={styles.sheetSubtitle}>
                  AI 为你拆解了 {aiTasks.length} 个步骤，可长按拖拽调整顺序
                </Text>

                {aiTasks.map((t, i) => (
                  <View key={i} style={styles.aiTaskItem}>
                    <Text style={styles.aiTaskIndex}>{i + 1}</Text>
                    <Text style={styles.aiTaskText}>{t}</Text>
                  </View>
                ))}

                <View style={styles.aiActionRow}>
                  <Pressable
                    style={[styles.submitBtn, styles.submitBtnSecondary]}
                    onPress={handleAIDecompose}
                  >
                    <Text style={[styles.submitBtnText, { color: Colors.accentBlue }]}>
                      重新拆解
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.submitBtn}
                    onPress={() => handleSubmit(aiTasks)}
                  >
                    <Text style={styles.submitBtnText}>就这样，开始！</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  kvContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor:  Colors.surface,
    borderTopLeftRadius:  Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: 24,
    paddingBottom:     40,
    paddingTop:        12,
    maxHeight:         SCREEN_H * 0.88,
    ...Shadow.sheet,
  },
  handle: {
    width:           40,
    height:           4,
    borderRadius:    Radius.pill,
    backgroundColor: Colors.separator,
    alignSelf:       'center',
    marginBottom:    20,
  },
  sheetTitle: {
    fontSize:   24,
    fontWeight: '700',
    color:      Colors.textPrimary,
    marginBottom: 6,
  },
  sheetSubtitle: {
    ...Typography.caption,
    marginBottom: 20,
  },
  modeRow: {
    flexDirection: 'row',
    gap:           8,
    marginBottom:  20,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical:    8,
    borderRadius:      Radius.pill,
    backgroundColor:   Colors.background,
  },
  modeChipActive: {
    backgroundColor: Colors.textPrimary,
  },
  modeChipText: {
    fontSize:   13,
    fontWeight: '500',
    color:      Colors.textSecondary,
  },
  modeChipTextActive: {
    color: '#fff',
  },
  goalInput: {
    fontSize:         20,
    fontWeight:       '500',
    color:            Colors.textPrimary,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.separator,
    paddingVertical:   12,
    marginBottom:      24,
  },
  loadingRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            12,
    paddingVertical: 16,
  },
  loadingText: {
    ...Typography.caption,
    fontSize: 14,
  },
  manualInput: {
    fontSize:         16,
    color:            Colors.textPrimary,
    borderWidth:      1,
    borderColor:      Colors.separator,
    borderRadius:     Radius.small,
    padding:          14,
    minHeight:        140,
    textAlignVertical: 'top',
    lineHeight:        26,
    marginBottom:      20,
  },
  submitBtn: {
    backgroundColor: Colors.textPrimary,
    paddingVertical: 16,
    borderRadius:    Radius.button,
    alignItems:      'center',
    marginTop:        8,
    marginBottom:     4,
  },
  submitBtnSecondary: {
    backgroundColor: Colors.background,
    flex: 1,
    marginRight: 8,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.separator,
  },
  submitBtnText: {
    fontSize:   16,
    fontWeight: '600',
    color:      '#fff',
  },
  aiTaskItem: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
    gap: 14,
  },
  aiTaskIndex: {
    fontSize:         14,
    fontWeight:       '600',
    color:            Colors.textSecondary,
    width:            20,
    textAlign:        'center',
    marginTop:         1,
  },
  aiTaskText: {
    flex:       1,
    fontSize:   16,
    color:      Colors.textPrimary,
    lineHeight: 22,
  },
  aiActionRow: {
    flexDirection: 'row',
    marginTop:     20,
  },
});
