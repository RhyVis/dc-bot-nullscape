import axios from 'axios';
import JSZip from 'jszip';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';
import {
  GenerateImageParams,
  GenerateImageResult,
  NovelAIPayload,
  NAIModelId,
  V4_MODELS,
  DEFAULT_NEGATIVE_PROMPT,
  MODEL_DEFAULTS,
} from '../types/novelai.js';

const NAI_API_URL = `${config.novelai.baseUrl}/ai/generate-image`;

/**
 * 检查模型是否为 V4+ 版本
 */
function isV4Model(model: string): boolean {
  return V4_MODELS.includes(model as NAIModelId);
}

/**
 * 获取模型默认参数
 */
function getModelDefaults(model: string) {
  return (
    MODEL_DEFAULTS[model as NAIModelId] ?? MODEL_DEFAULTS['nai-diffusion-3']
  );
}

/**
 * 构建 NovelAI API 请求 payload
 */
function buildPayload(params: GenerateImageParams): NovelAIPayload {
  const modelDefaults = getModelDefaults(params.model);

  const {
    prompt,
    negative_prompt = DEFAULT_NEGATIVE_PROMPT,
    model,
    width = 832,
    height = 1216,
    steps = modelDefaults.steps,
    scale = modelDefaults.scale,
    sampler = modelDefaults.sampler,
    seed = Math.floor(Math.random() * 4294967295),
    smea,
    smea_dyn,
  } = params;

  const basePayload: NovelAIPayload = {
    input: prompt,
    model,
    action: 'generate',
    parameters: {
      width,
      height,
      scale,
      sampler,
      steps,
      seed,
      n_samples: 1,
      negative_prompt,
      // 通用参数
      ucPreset: 0,
      qualityToggle: false,
      dynamic_thresholding: false,
      controlnet_strength: 1,
      legacy: false,
      add_original_image: false,
    },
  };

  // V4+ 模型需要特殊参数
  if (isV4Model(model)) {
    basePayload.parameters.params_version = 3;
    basePayload.parameters.use_coords = true;
    basePayload.parameters.legacy_v3_extend = false;
    basePayload.parameters.noise_schedule = 'karras';
    // V4 模型不支持 SMEA
    basePayload.parameters.sm = false;
    basePayload.parameters.sm_dyn = false;

    basePayload.parameters.v4_prompt = {
      caption: {
        base_caption: prompt,
        char_captions: [],
      },
      use_coords: false,
      use_order: true,
    };
    basePayload.parameters.v4_negative_prompt = {
      caption: {
        base_caption: negative_prompt,
        char_captions: [],
      },
    };
  } else {
    // V3 模型支持 SMEA
    basePayload.parameters.sm = smea ?? modelDefaults.smea;
    basePayload.parameters.sm_dyn = smea_dyn ?? modelDefaults.smea_dyn;
  }

  return basePayload;
}

/**
 * 调用 NovelAI API 生成图片
 */
export async function generateImage(
  params: GenerateImageParams,
): Promise<GenerateImageResult> {
  const payload = buildPayload(params);
  const seed = payload.parameters.seed;

  logger.debug('Generating image with NovelAI', {
    model: params.model,
    prompt: params.prompt.substring(0, 100),
    seed,
    isV4: isV4Model(params.model),
  });

  try {
    const response = await axios.post(NAI_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${config.novelai.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/zip',
      },
      responseType: 'arraybuffer',
      timeout: 120000, // 2 分钟超时
    });

    // 解压 ZIP 获取图片
    const zip = await JSZip.loadAsync(response.data);
    const imageFileName = Object.keys(zip.files).find((f) =>
      f.endsWith('.png'),
    );

    if (!imageFileName) {
      throw new Error('No PNG file found in response');
    }

    const imageFile = zip.files[imageFileName];
    const buffer = await imageFile.async('nodebuffer');

    logger.info('Image generated successfully', {
      model: params.model,
      seed,
      size: buffer.length,
    });

    return {
      buffer,
      seed,
      prompt: params.prompt,
      model: params.model,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      let errorMessage = 'Unknown error';

      switch (status) {
        case 400:
          errorMessage = 'Invalid parameters';
          break;
        case 401:
          errorMessage = 'Invalid NovelAI API key';
          break;
        case 402:
          errorMessage = 'Insufficient Anlas (credits)';
          break;
        case 429:
          errorMessage = 'Rate limited, please try again later';
          break;
        case 500:
          // V4 模型有时会返回 500，尝试简化参数重试
          if (isV4Model(params.model)) {
            logger.warn(
              'V4 model 500 error, attempting retry with simplified params',
            );
            return retryWithSimplifiedParams(params, seed);
          }
          errorMessage = 'NovelAI server error';
          break;
        default:
          errorMessage = error.message;
      }

      logger.error('NovelAI API error', {
        status,
        message: errorMessage,
      });

      throw new Error(errorMessage);
    }

    throw error;
  }
}

/**
 * V4 模型 500 错误时的重试逻辑
 */
async function retryWithSimplifiedParams(
  params: GenerateImageParams,
  originalSeed: number,
): Promise<GenerateImageResult> {
  const modelDefaults = getModelDefaults(params.model);

  const simplifiedPayload: NovelAIPayload = {
    input: params.prompt,
    model: params.model,
    action: 'generate',
    parameters: {
      width: params.width ?? 832,
      height: params.height ?? 1216,
      scale: params.scale ?? modelDefaults.scale,
      sampler: params.sampler ?? modelDefaults.sampler,
      steps: params.steps ?? modelDefaults.steps,
      seed: originalSeed,
      n_samples: 1,
      negative_prompt: params.negative_prompt ?? DEFAULT_NEGATIVE_PROMPT,
      params_version: 3,
      use_coords: true,
      sm: false,
      sm_dyn: false,
      noise_schedule: 'karras',
    },
  };

  try {
    const response = await axios.post(NAI_API_URL, simplifiedPayload, {
      headers: {
        'Authorization': `Bearer ${config.novelai.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/zip',
      },
      responseType: 'arraybuffer',
      timeout: 120000,
    });

    const zip = await JSZip.loadAsync(response.data);
    const imageFileName = Object.keys(zip.files).find((f) =>
      f.endsWith('.png'),
    );

    if (!imageFileName) {
      throw new Error('No PNG file found in response');
    }

    const imageFile = zip.files[imageFileName];
    const buffer = await imageFile.async('nodebuffer');

    logger.info('Image generated successfully (retry)', {
      model: params.model,
      seed: originalSeed,
      size: buffer.length,
    });

    return {
      buffer,
      seed: originalSeed,
      prompt: params.prompt,
      model: params.model,
    };
  } catch (retryError) {
    logger.error('Retry also failed', {
      error: retryError instanceof Error ? retryError.message : 'Unknown error',
    });
    throw new Error('NovelAI server error (V4 model), please try V3 model');
  }
}
