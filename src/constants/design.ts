import { Dimensions } from 'react-native';

export const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── 胶囊配色 ─────────────────────────────────────────────────
export const CapsuleColors = {
  background:      '#F8F7F4',            // 护眼暖白，主背景
  thread:          '#DEDEDE',            // 时间引线

  activeRed:       '#D44E4E',            // 左半壳：暖红
  activeBlue:      '#4B71B8',            // 右半壳：沉蓝

  historyBlue:     '#4B71B8',            // 历史药丸：纯蓝
  inboxGray:       '#AAAAAA',            // 药盒胶囊

  addBlack:        '#000000',            // 新增按钮左壳
  addWhite:        '#FFFFFF',            // 新增按钮右壳

  textOnCapsule:   'rgba(255,255,255,0.92)',
  textActive:      '#1A1A1A',            // 拉开区域文字（深色背景下）
  textMuted:       '#B0B0B0',
} as const;

// ─── 胶囊尺寸 ─────────────────────────────────────────────────
// 公式: CONTAINER_W = HALF_W * 2 + OPEN_GAP * 2
export const CapsuleDims = {
  halfW:        80,    // 每个半壳宽（更接近胶囊比例）
  capsuleH:     44,    // 激活胶囊高
  openGap:      30,    // 激活时每侧向外推的最小距离（动态文字扩展）
  containerW:  220,    // = 80*2 + 30*2

  histPillW:    48,    // 历史药丸宽
  histPillH:    20,    // 历史药丸高

  threadW:       1.5,
  stepH:        60,    // 胶囊中心间距

  addBtnW:     100,    // 与 Pencil 一致
  addBtnH:      48,    // 与 Pencil 一致

  swipeThreshold: 72,  // 触发操作的最小滑动距离
} as const;

// ─── 弹簧参数 ─────────────────────────────────────────────────
export const Spring = {
  open:     { damping: 18, stiffness: 200, mass: 1 },
  snapBack: { damping: 22, stiffness: 220, mass: 1 },
  sheet:    { damping: 22, stiffness: 200, mass: 1 },
} as const;
