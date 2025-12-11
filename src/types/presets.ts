/**
 * 提示词预设接口
 * 用于分离质量标签、风格标签和负向标签
 */
export interface PromptPreset {
  /** 预设 ID */
  id: string;
  /** 预设显示名称 */
  name: string;
  /** 预设描述 */
  description: string;
  /** 质量标签 (添加到正向提示词前面) */
  qualityTags: string;
  /** 负向提示词 */
  negativeTags: string;
  /** 适用的模型类型 */
  modelType: "all" | "v3" | "v4";
}

/**
 * 内置预设定义
 */
export const PROMPT_PRESETS: Record<string, PromptPreset> = {
  // 通用动漫风格 - 默认预设
  anime: {
    id: "anime",
    name: "🎨 Anime",
    description: "通用动漫插画风格，高质量输出",
    qualityTags: "masterpiece, best quality, very aesthetic, absurdres",
    negativeTags:
      "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name",
    modelType: "all",
  },

  // 写实风格
  realistic: {
    id: "realistic",
    name: "📷 Realistic",
    description: "写实照片风格",
    qualityTags:
      "photorealistic, best quality, amazing quality, very aesthetic, absurdres, ultra detailed",
    negativeTags:
      "illustration, painting, drawing, art, sketch, anime, cartoon, 3d render, lowres, bad anatomy, bad hands, text, error, cropped, worst quality, low quality, jpeg artifacts, signature, watermark, username, blurry",
    modelType: "all",
  },

  // 艺术绘画风格
  artistic: {
    id: "artistic",
    name: "🖼️ Artistic",
    description: "艺术绘画风格，如油画、水彩等",
    qualityTags:
      "masterpiece, best quality, very aesthetic, artistic, detailed",
    negativeTags:
      "lowres, bad anatomy, text, error, cropped, worst quality, low quality, jpeg artifacts, signature, watermark, blurry, photo, photorealistic",
    modelType: "all",
  },

  // Furry 风格
  furry: {
    id: "furry",
    name: "🦊 Furry",
    description: "Furry / 兽人风格",
    qualityTags: "{best quality}, {amazing quality}, very aesthetic",
    negativeTags:
      "lowres, bad anatomy, bad hands, text, error, missing fingers, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, blurry, human",
    modelType: "all",
  },

  // 无预设 - 完全自定义
  none: {
    id: "none",
    name: "⚪ None",
    description: "不添加任何预设标签",
    qualityTags: "",
    negativeTags: "",
    modelType: "all",
  },
} as const;

export type PresetId = keyof typeof PROMPT_PRESETS;

/**
 * 获取所有预设列表
 */
export function getAllPresets(): PromptPreset[] {
  return Object.values(PROMPT_PRESETS);
}

/**
 * 获取预设列表（用于命令选项）
 */
export function getPresetChoices(): Array<{ name: string; value: string }> {
  return Object.values(PROMPT_PRESETS).map((preset) => ({
    name: `${preset.name} - ${preset.description}`,
    value: preset.id,
  }));
}

/**
 * 根据 ID 获取预设
 */
export function getPreset(id: string): PromptPreset | undefined {
  return PROMPT_PRESETS[id];
}

/**
 * 获取默认预设
 */
export function getDefaultPreset(): PromptPreset {
  return PROMPT_PRESETS.anime;
}
