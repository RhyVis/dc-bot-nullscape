export interface GenerateImageParams {
  prompt: string;
  negative_prompt?: string;
  model: string;
  width?: number;
  height?: number;
  steps?: number;
  scale?: number;
  sampler?: string;
  seed?: number;
  /** SMEA 采样器 (仅 V3) */
  smea?: boolean;
  /** SMEA DYN 采样器 (仅 V3) */
  smea_dyn?: boolean;
}

export interface GenerateImageResult {
  buffer: Buffer;
  seed: number;
  prompt: string;
  model: string;
}

/** V4 角色提示词结构 */
export interface V4CharacterCaption {
  char_caption: string;
  centers: Array<{ x: number; y: number }>;
}

/** V4 提示词结构 */
export interface V4PromptStructure {
  caption: {
    base_caption: string;
    char_captions: V4CharacterCaption[];
  };
  use_coords: boolean;
  use_order: boolean;
}

export interface NovelAIPayload {
  input: string;
  model: string;
  action: 'generate';
  parameters: {
    width: number;
    height: number;
    scale: number;
    sampler: string;
    steps: number;
    seed: number;
    n_samples: number;
    negative_prompt: string;
    // V3 SMEA 参数
    sm?: boolean;
    sm_dyn?: boolean;
    // V4+ 专用参数
    params_version?: number;
    use_coords?: boolean;
    legacy_v3_extend?: boolean;
    noise_schedule?: string;
    v4_prompt?: V4PromptStructure;
    v4_negative_prompt?: {
      caption: {
        base_caption: string;
        char_captions: V4CharacterCaption[];
      };
    };
    // 通用参数
    ucPreset?: number;
    qualityToggle?: boolean;
    dynamic_thresholding?: boolean;
    controlnet_strength?: number;
    legacy?: boolean;
    add_original_image?: boolean;
  };
}

export const NAI_MODELS = {
  'nai-diffusion-4-5-full': '🌟 V4.5 Full',
  'nai-diffusion-4-5-curated': '✨ V4.5 Curated',
  'nai-diffusion-4-full': '🎯 V4 Full',
  'nai-diffusion-4-curated': '📌 V4 Curated',
  'nai-diffusion-3': '🎨 V3 Anime',
  'nai-diffusion-furry-v3': '🐺 V3 Furry',
} as const;

export type NAIModelId = keyof typeof NAI_MODELS;

export const NAI_SAMPLERS = [
  'k_euler',
  'k_euler_ancestral',
  'k_dpmpp_2s_ancestral',
  'k_dpmpp_2m',
  'k_dpmpp_sde',
  'ddim_v3',
] as const;

export type NAISampler = (typeof NAI_SAMPLERS)[number];

/**
 * 默认负向提示词
 * - 通用负向：用于避免常见的图片质量问题
 */
export const DEFAULT_NEGATIVE_PROMPT =
  'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry';

/**
 * V4+ 模型的默认质量标签 (自动添加到提示词末尾)
 * 参考 NovelAI 官方 Add Quality Tags 功能
 */
export const V4_QUALITY_TAGS = {
  'nai-diffusion-4-5-full': ', location, very aesthetic, masterpiece, no text',
  'nai-diffusion-4-5-curated':
    ', location, masterpiece, no text, -0.8::feet::, rating:general',
  'nai-diffusion-4-full': ', no text, best quality, very aesthetic, absurdres',
  'nai-diffusion-4-curated':
    ', rating:general, amazing quality, very aesthetic, absurdres',
} as const;

/**
 * V3 模型的默认质量标签
 */
export const V3_QUALITY_TAGS = {
  'nai-diffusion-3':
    ', best quality, amazing quality, very aesthetic, absurdres',
  'nai-diffusion-furry-v3': ', {best quality}, {amazing quality}',
} as const;

// V4+ models require special parameters
export const V4_MODELS: NAIModelId[] = [
  'nai-diffusion-4-5-full',
  'nai-diffusion-4-5-curated',
  'nai-diffusion-4-full',
  'nai-diffusion-4-curated',
];

/**
 * 模型默认参数配置
 */
export const MODEL_DEFAULTS: Record<
  NAIModelId,
  {
    scale: number;
    steps: number;
    sampler: NAISampler;
    smea: boolean;
    smea_dyn: boolean;
  }
> = {
  'nai-diffusion-4-5-full': {
    scale: 5,
    steps: 28,
    sampler: 'k_euler_ancestral',
    smea: false,
    smea_dyn: false,
  },
  'nai-diffusion-4-5-curated': {
    scale: 5,
    steps: 28,
    sampler: 'k_euler_ancestral',
    smea: false,
    smea_dyn: false,
  },
  'nai-diffusion-4-full': {
    scale: 7,
    steps: 28,
    sampler: 'k_euler_ancestral',
    smea: false,
    smea_dyn: false,
  },
  'nai-diffusion-4-curated': {
    scale: 7,
    steps: 28,
    sampler: 'k_euler_ancestral',
    smea: false,
    smea_dyn: false,
  },
  'nai-diffusion-3': {
    scale: 5,
    steps: 28,
    sampler: 'k_euler_ancestral',
    smea: true,
    smea_dyn: true,
  },
  'nai-diffusion-furry-v3': {
    scale: 5,
    steps: 28,
    sampler: 'k_euler_ancestral',
    smea: true,
    smea_dyn: true,
  },
};

/**
 * 尺寸预设
 */
export const SIZE_PRESETS = {
  portrait: { width: 832, height: 1216, name: '📱 Portrait (832×1216)' },
  portrait_small: {
    width: 512,
    height: 768,
    name: '📱 Portrait Small (512×768)',
  },
  landscape: { width: 1216, height: 832, name: '🖼️ Landscape (1216×832)' },
  landscape_small: {
    width: 768,
    height: 512,
    name: '🖼️ Landscape Small (768×512)',
  },
  square: { width: 1024, height: 1024, name: '⬜ Square (1024×1024)' },
  square_small: { width: 512, height: 512, name: '⬜ Square Small (512×512)' },
  wide: { width: 1536, height: 640, name: '📺 Wide (1536×640)' },
  tall: { width: 640, height: 1536, name: '📐 Tall (640×1536)' },
} as const;

export type SizePreset = keyof typeof SIZE_PRESETS;
