/**
 * 语法转换服务
 * 将统一的强调语法格式转换为不同模型支持的格式
 *
 * 统一语法格式:
 * - 正向强调: <tag:1.5> 或 <tag:+2>
 * - 负向强调: <tag:-1> 或 <tag:-0.5>
 * - 无权重则默认 1.0
 *
 * V3 模型格式:
 * - 正向强调: {tag} = 1.05x, {{tag}} = 1.1025x, {{{tag}}} ≈ 1.16x
 * - 负向强调: [tag] = 0.95x, [[tag]] = 0.9x
 *
 * V4+ 模型格式:
 * - 正向强调: 1.5::tag ::
 * - 负向强调: -1::tag :: (V4.5+) 或 0.5::tag :: (V4)
 */

import { V4_MODELS, NAIModelId } from "../types/novelai.js";

/** 检查是否为 V4+ 模型 */
function isV4Model(model: string): boolean {
  return V4_MODELS.includes(model as NAIModelId);
}

/** 检查是否为 V4.5 模型（支持负向数值强调） */
function isV45Model(model: string): boolean {
  return model.includes("4-5");
}

/**
 * 统一强调语法的正则表达式
 * 匹配: <tag:1.5>, <tag:-1>, <tag:+2>, <tag> (默认1.0)
 */
const EMPHASIS_REGEX = /<([^:>]+)(?::([+-]?\d*\.?\d+))?>/g;

/**
 * V3 花括号语法的正则表达式
 * 匹配: {tag}, {{tag}}, [tag], [[tag]]
 */
const V3_BRACE_REGEX = /(\{+)([^{}]+)(\}+)|(\[+)([^\[\]]+)(\]+)/g;

/**
 * V4 数值语法的正则表达式
 * 匹配: 1.5::tag ::, -1::tag ::
 */
const V4_NUMERIC_REGEX = /([+-]?\d*\.?\d+)::([^:]+)::/g;

/**
 * 将权重值转换为 V3 花括号数量
 * @param weight 权重值 (e.g., 1.5, 0.8, -1)
 * @returns 花括号类型和数量
 */
function weightToV3Braces(weight: number): { char: string; count: number } {
  if (weight >= 1) {
    // 正向强调用 {}
    // 每个 {} 是 1.05x，计算需要多少层
    const layers = Math.round(Math.log(weight) / Math.log(1.05));
    return { char: "{}", count: Math.max(1, Math.min(layers, 5)) };
  } else if (weight > 0) {
    // 弱化用 []
    const layers = Math.round(Math.log(1 / weight) / Math.log(1.05));
    return { char: "[]", count: Math.max(1, Math.min(layers, 5)) };
  } else {
    // 负向强调在 V3 中不直接支持，用多层 [] 模拟
    return { char: "[]", count: 5 };
  }
}

/**
 * 将统一语法转换为 V3 格式
 */
function convertToV3(text: string): string {
  return text.replace(EMPHASIS_REGEX, (_, tag: string, weightStr?: string) => {
    const weight = weightStr ? parseFloat(weightStr) : 1.0;

    if (Math.abs(weight - 1.0) < 0.01) {
      // 权重接近 1.0，不需要强调
      return tag;
    }

    const { char, count } = weightToV3Braces(weight);
    const open = char[0].repeat(count);
    const close = char[1].repeat(count);
    return `${open}${tag}${close}`;
  });
}

/**
 * 将统一语法转换为 V4 格式
 */
function convertToV4(text: string, isV45: boolean): string {
  return text.replace(EMPHASIS_REGEX, (_, tag: string, weightStr?: string) => {
    const weight = weightStr ? parseFloat(weightStr) : 1.0;

    if (Math.abs(weight - 1.0) < 0.01) {
      // 权重接近 1.0，不需要强调
      return tag;
    }

    // V4.5 支持负向数值，V4 需要转换为正向
    let finalWeight = weight;
    if (weight < 0 && !isV45) {
      // V4 不支持负向，转换为接近 0 的正值
      finalWeight = Math.max(0.1, 1 + weight);
    }

    return `${finalWeight}::${tag} ::`;
  });
}

/**
 * 将 V3 花括号语法转换为统一格式
 */
function parseV3ToUnified(text: string): string {
  return text.replace(V3_BRACE_REGEX, (...args) => {
    if (args[1]) {
      // 匹配 {tag}
      const count = args[1].length;
      const tag = args[2];
      const weight = Math.pow(1.05, count);
      return `<${tag}:${weight.toFixed(2)}>`;
    } else if (args[4]) {
      // 匹配 [tag]
      const count = args[4].length;
      const tag = args[5];
      const weight = Math.pow(0.95, count);
      return `<${tag}:${weight.toFixed(2)}>`;
    }
    return args[0];
  });
}

/**
 * 将 V4 数值语法转换为统一格式
 */
function parseV4ToUnified(text: string): string {
  return text.replace(V4_NUMERIC_REGEX, (_, weightStr: string, tag: string) => {
    const weight = parseFloat(weightStr);
    return `<${tag.trim()}:${weight}>`;
  });
}

/**
 * 转换强调语法到目标模型格式
 * @param text 包含统一强调语法的文本
 * @param targetModel 目标模型 ID
 * @returns 转换后的文本
 */
export function convertEmphasis(text: string, targetModel: string): string {
  if (isV4Model(targetModel)) {
    return convertToV4(text, isV45Model(targetModel));
  } else {
    return convertToV3(text);
  }
}

/**
 * 检测并转换任意格式到统一格式
 * @param text 可能包含 V3 或 V4 语法的文本
 * @returns 统一格式的文本
 */
export function normalizeEmphasis(text: string): string {
  let result = text;

  // 先尝试转换 V3 语法
  if (V3_BRACE_REGEX.test(result)) {
    result = parseV3ToUnified(result);
  }

  // 再尝试转换 V4 语法
  if (V4_NUMERIC_REGEX.test(result)) {
    result = parseV4ToUnified(result);
  }

  return result;
}

/**
 * 自动转换语法：检测输入格式并转换为目标模型格式
 * @param text 输入文本（可能是任意格式）
 * @param targetModel 目标模型 ID
 * @returns 适配目标模型的文本
 */
export function autoConvertSyntax(text: string, targetModel: string): string {
  // 先标准化为统一格式
  const normalized = normalizeEmphasis(text);
  // 再转换为目标格式
  return convertEmphasis(normalized, targetModel);
}
