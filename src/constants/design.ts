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

  addBlack:        '#111111',            // 新增按钮左壳
  addWhite:        '#F0EEE9',            // 新增按钮右壳

  textOnCapsule:   'rgba(255,255,255,0.92)',
  textActive:      '#1A1A1A',            // 拉开区域文字（深色背景下）
  textMuted:       '#B0B0B0',
} as const;

// ─── 胶囊尺寸 ─────────────────────────────────────────────────
// 公式: CONTAINER_W = HALF_W * 2 + OPEN_GAP * 2
export const CapsuleDims = {
  halfW:        110,   // 每个半壳宽
  capsuleH:      52,   // 激活胶囊高
  openGap:       42,   // 激活时每侧向外推的距离
  containerW:   304,   // = 110*2 + 42*2

  upcomingW:    240,   // 待做胶囊宽
  upcomingH:     44,   // 待做胶囊高

  histPillW:     60,   // 历史药丸宽
  histPillH:     24,   // 历史药丸高

  threadW:        1.5,
  stepH:         72,   // 胶囊中心间距

  addBtnW:      148,
  addBtnH:       46,

  swipeThreshold: 72,  // 触发操作的最小滑动距离
} as const;

// ─── 弹簧参数 ─────────────────────────────────────────────────
export const Spring = {
  open:     { damping: 18, stiffness: 200, mass: 1 },
  snapBack: { damping: 22, stiffness: 220, mass: 1 },
  sheet:    { damping: 22, stiffness: 200, mass: 1 },
} as const;
