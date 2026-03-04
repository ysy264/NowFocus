/**
 * AI 任务拆解服务
 *
 * USE_MOCK = true  → 使用假数据，无需 API Key，可直接测试 UI
 * USE_MOCK = false → 调用真实 API（需在 .env 中配置 Key）
 */

// ─────────────────────────────────────────────────────────────
// ★ 切换这一行来启用/关闭 Mock 模式
const USE_MOCK = true;
// ─────────────────────────────────────────────────────────────

// ─── Mock 数据 ────────────────────────────────────────────────
// 根据输入关键词返回不同的 Mock 任务集，让测试更真实
const MOCK_PRESETS: Record<string, string[]> = {
  default: [
    'Mock: 明确目标范围与验收标准',
    'Mock: 拆解第一个可执行步骤',
    'Mock: 开始执行并记录进展',
    'Mock: 检查结果并调整方向',
    'Mock: 完成收尾与复盘总结',
  ],
  学习: [
    'Mock: 整理课程大纲标注重点',
    'Mock: 精读核心章节做笔记',
    'Mock: 完成随堂练习题',
    'Mock: 整理错题归纳规律',
    'Mock: 做一套真题自测',
  ],
  汇报: [
    'Mock: 收集关键数据与成果',
    'Mock: 确定汇报逻辑框架',
    'Mock: 制作 PPT 骨架',
    'Mock: 填充内容与图表',
    'Mock: 全程彩排计时两次',
  ],
};

const getMockTasks = (goalTitle: string): string[] => {
  for (const [key, tasks] of Object.entries(MOCK_PRESETS)) {
    if (key !== 'default' && goalTitle.includes(key)) return tasks;
  }
  return MOCK_PRESETS.default;
};

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

// ─── 真实 API 配置 ────────────────────────────────────────────
const API_KEY  = process.env.EXPO_PUBLIC_AI_API_KEY;
const BASE_URL = process.env.EXPO_PUBLIC_AI_BASE_URL ?? 'https://api.openai.com/v1';
const MODEL    = process.env.EXPO_PUBLIC_AI_MODEL    ?? 'gpt-4o-mini';

const SYSTEM_PROMPT = `\
你是一位世界顶级的任务拆解专家与认知负荷优化专家。
你的唯一职责：将用户输入的任何目标，拆解为一系列具体、可立即执行、有逻辑先后顺序的子步骤。

【输出格式 — 必须严格遵守】
输出唯一合法 JSON 对象，格式：{"tasks": ["子任务1", "子任务2", ...]}
• 每个子任务是简短的行动句，以动词开头，10 字以内为佳
• 子任务数量：3 ~ 8 个
• 禁止在 JSON 之外输出任何内容（无 markdown、无序号、无解释文字）

【拆解原则】
1. 每项必须是"可以立刻开始执行"的具体行动，而非方向或目标
2. 子任务之间有明确的逻辑顺序（依赖关系或时间先后）
3. 粒度适中：不宏观（"学好量子力学"），不微观（"拿起笔"）

【范例】
输入："复习量子力学期末考试"
输出：{"tasks": ["整理课程大纲并标注重点章节","精读波函数与薛定谔方程推导","理解不确定性原理","推导氢原子能级公式","完成三套历年真题","整理错题归纳考点"]}`;

// ─── 公共类型 ─────────────────────────────────────────────────
export class AIServiceError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export interface DecomposeResult {
  tasks: string[];
  rawContent: string;
  isMock?: boolean;
}

// ─── 核心函数 ─────────────────────────────────────────────────
export async function decomposeGoal(goalTitle: string): Promise<DecomposeResult> {
  // ── Mock 模式 ──────────────────────────────────────────────
  if (USE_MOCK) {
    await sleep(900); // 模拟网络延迟，让 Loading 状态可见
    const tasks = getMockTasks(goalTitle);
    return { tasks, rawContent: JSON.stringify({ tasks }), isMock: true };
  }

  // ── 真实 API 调用 ──────────────────────────────────────────
  if (!API_KEY) {
    throw new AIServiceError(
      '未检测到 API Key，请在 .env 中配置 EXPO_PUBLIC_AI_API_KEY，或将 USE_MOCK 设为 true'
    );
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: goalTitle.trim() },
        ],
        temperature: 0.3,
        max_tokens:  1024,
      }),
    });
  } catch (err) {
    throw new AIServiceError(`网络请求失败：${String(err)}`);
  }

  if (!response.ok) {
    let msg = `API 请求失败 (HTTP ${response.status})`;
    try {
      const body = await response.json();
      msg = body?.error?.message ?? msg;
    } catch { /* ignore */ }
    throw new AIServiceError(msg, response.status);
  }

  const data       = await response.json();
  const rawContent = String(data?.choices?.[0]?.message?.content ?? '');

  let tasks: string[] = [];
  try {
    const parsed = JSON.parse(rawContent);
    if (Array.isArray(parsed))             tasks = parsed;
    else if (Array.isArray(parsed?.tasks)) tasks = parsed.tasks;
    else {
      const first = Object.values(parsed).find(Array.isArray);
      if (Array.isArray(first)) tasks = first as string[];
    }
  } catch {
    throw new AIServiceError(`模型返回内容无法解析为 JSON：\n${rawContent}`);
  }

  tasks = tasks.map(t => String(t).trim()).filter(t => t.length > 0);
  if (tasks.length === 0) throw new AIServiceError('模型返回了空的任务列表，请重试');

  return { tasks, rawContent };
}
