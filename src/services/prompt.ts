/**
 * Prompt 组装服务
 * 将预设标签、用户提示词组合并转换为目标模型格式
 */

import { PromptPreset } from "../types/presets.js";
import { autoConvertSyntax } from "./syntax.js";

export interface BuildPromptOptions {
  /** 用户输入的场景描述标签 */
  scenePrompt: string;
  /** 用户输入的额外负向提示词（可选） */
  userNegative?: string;
  /** 预设对象 */
  preset: PromptPreset;
  /** 目标模型 ID */
  model: string;
}

export interface BuiltPrompt {
  /** 最终正向提示词 */
  positive: string;
  /** 最终负向提示词 */
  negative: string;
  /** 使用的预设名称 */
  presetName: string;
}

/**
 * 组装最终提示词
 * 按顺序组合: [preset.qualityTags], [scenePrompt]
 * 负向: [preset.negativeTags], [userNegative]
 */
export function buildFinalPrompt(options: BuildPromptOptions): BuiltPrompt {
  const { scenePrompt, userNegative, preset, model } = options;

  // 组合正向提示词
  const positiveParts: string[] = [];

  if (preset.qualityTags) {
    positiveParts.push(preset.qualityTags);
  }

  if (scenePrompt) {
    positiveParts.push(scenePrompt.trim());
  }

  // 组合负向提示词
  const negativeParts: string[] = [];

  if (preset.negativeTags) {
    negativeParts.push(preset.negativeTags);
  }

  if (userNegative) {
    negativeParts.push(userNegative.trim());
  }

  // 合并并转换语法
  const rawPositive = positiveParts.join(", ");
  const rawNegative = negativeParts.join(", ");

  return {
    positive: autoConvertSyntax(rawPositive, model),
    negative: autoConvertSyntax(rawNegative, model),
    presetName: preset.name,
  };
}

/**
 * 仅转换用户提示词语法（不添加预设）
 * 用于用户已经手动添加预设或使用 none 预设的情况
 */
export function convertUserPrompt(userPrompt: string, model: string): string {
  return autoConvertSyntax(userPrompt, model);
}
