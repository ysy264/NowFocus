/**
 * AddCapsuleSheet
 *
 * 底部弹出的极简输入层。
 * 两个按钮：
 *   「加入队列」→ addToQueue（追加到主引线末尾）
 *   「存入药盒」→ addToInbox（随手备忘，不排队）
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { CapsuleColors, CapsuleDims, SCREEN_H } from '../constants/design';
import { useTaskStore } from '../store/taskStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const AddCapsuleSheet: React.FC<Props> = ({ visible, onClose }) => {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const addToQueue = useTaskStore(s => s.addToQueue);
  const addToInbox = useTaskStore(s => s.addToInbox);

  if (!visible) return null;

  const handleQueue = () => {
    const t = text.trim();
    if (!t) return;
    addToQueue(t);
    setText('');
    onClose();
  };

  const handleInbox = () => {
    const t = text.trim();
    if (!t) return;
    addToInbox(t);
    setText('');
    onClose();
  };

  const canSubmit = text.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.overlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 点击背景关闭 */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        {/* 顶部把手 */}
        <View style={styles.handle} />

        <Text style={styles.title}>新建胶囊</Text>

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="想做什么？"
          placeholderTextColor={CapsuleColors.textMuted}
          value={text}
          onChangeText={setText}
          autoFocus
          maxLength={80}
          returnKeyType="done"
          onSubmitEditing={handleQueue}
          multiline={false}
        />

        <View style={styles.btnRow}>
          {/* 加入队列：红蓝胶囊风格 */}
          <TouchableOpacity
            style={[styles.actionBtn, !canSubmit && styles.btnDisabled]}
            onPress={handleQueue}
            activeOpacity={0.8}
            disabled={!canSubmit}
          >
            <View style={[styles.actionHalf, { backgroundColor: CapsuleColors.activeRed }]} />
            <View style={[styles.actionHalf, { backgroundColor: CapsuleColors.activeBlue }]} />
            <Text style={styles.actionBtnText}>加入队列</Text>
          </TouchableOpacity>

          {/* 存入药盒：灰色胶囊风格 */}
          <TouchableOpacity
            style={[styles.inboxBtn, !canSubmit && styles.btnDisabled]}
            onPress={handleInbox}
            activeOpacity={0.8}
            disabled={!canSubmit}
          >
            <View style={[styles.actionHalf, { backgroundColor: CapsuleColors.inboxGray }]} />
            <View style={[styles.actionHalf, { backgroundColor: CapsuleColors.inboxGray, opacity: 0.5 }]} />
            <Text style={styles.inboxBtnText}>存入药盒</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const { addBtnH } = CapsuleDims;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent:  'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex:           50,
  },
  sheet: {
    backgroundColor:     '#FFFFFF',
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    paddingHorizontal:    24,
    paddingTop:           12,
    paddingBottom:        40,
  },
  handle: {
    width:           40,
    height:           4,
    borderRadius:     2,
    backgroundColor: '#E0E0E0',
    alignSelf:       'center',
    marginBottom:    16,
  },
  title: {
    fontSize:   16,
    fontWeight: '700',
    color:      '#1A1A1A',
    marginBottom: 14,
  },
  input: {
    height:           48,
    borderWidth:       1,
    borderColor:      '#E8E8E8',
    borderRadius:     14,
    paddingHorizontal: 16,
    fontSize:          15,
    color:            '#1A1A1A',
    backgroundColor:  '#FAFAFA',
    marginBottom:     20,
  },
  btnRow: {
    flexDirection: 'row',
    gap:            12,
  },

  // 加入队列按钮 / 存入药盒按钮（共用）
  actionBtn: {
    flex:           1,
    height:         addBtnH,
    borderRadius:   addBtnH / 2,
    flexDirection:  'row',
    overflow:       'hidden',
  },
  inboxBtn: {
    flex:           1,
    height:         addBtnH,
    borderRadius:   addBtnH / 2,
    flexDirection:  'row',
    overflow:       'hidden',
  },
  // 左右各占 50%（内联 flex 子项，不用 absolute）
  actionHalf: {
    flex:   1,
    height: addBtnH,
  },
  // 文字绝对居中覆盖在两半壳上
  actionBtnText: {
    position:   'absolute',
    left:        0,
    right:       0,
    top:         0,
    bottom:      0,
    textAlign:  'center',
    textAlignVertical: 'center',
    color:      '#FFFFFF',
    fontSize:   14,
    fontWeight: '700',
  },
  inboxBtnText: {
    position:   'absolute',
    left:        0,
    right:       0,
    top:         0,
    bottom:      0,
    textAlign:  'center',
    textAlignVertical: 'center',
    color:      '#FFFFFF',
    fontSize:   14,
    fontWeight: '600',
  },

  btnDisabled: {
    opacity: 0.4,
  },
});
