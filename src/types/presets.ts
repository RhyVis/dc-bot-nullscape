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
}
