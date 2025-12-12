import { getLimitMode } from '../core/settings/settingsService.js';

const MULTIPLE = 64;

function alignDownToMultiple(value: number, multiple: number): number {
  return Math.floor(value / multiple) * multiple;
}

function ensureMinMultiple(value: number, multiple: number): number {
  return value < multiple ? multiple : value;
}

export interface LimitedSizeResult {
  width: number;
  height: number;
  limited: boolean;
  originalWidth: number;
  originalHeight: number;
}

export function isLimitModeEnabled(): boolean {
  return getLimitMode();
}

/**
 * 在限制模式下，将宽高缩放到不超过 1024x1024，保持大致纵横比并对齐到 64 的倍数。
 * 非限制模式下直接返回原尺寸。
 */
export function applyLimitModeToSize(
  width: number,
  height: number,
  sizePresetId?: string,
): LimitedSizeResult {
  const originalWidth = width;
  const originalHeight = height;

  if (!isLimitModeEnabled()) {
    return { width, height, limited: false, originalWidth, originalHeight };
  }

  // 现在限制模式不再做“硬上限 1024”裁剪，而是按尺寸预设做缩放。
  // - 对有 small 版本的预设：切到对应 small。
  // - 其他尺寸：默认按 0.5 缩放并对齐到 64 的倍数。
  const preset = (sizePresetId ?? '').toLowerCase();

  let targetWidth = width;
  let targetHeight = height;

  if (preset.endsWith('_small')) {
    // 已是小尺寸，不做处理
    return { width, height, limited: false, originalWidth, originalHeight };
  }

  if (preset === 'portrait') {
    targetWidth = 512;
    targetHeight = 768;
  } else if (preset === 'landscape') {
    targetWidth = 768;
    targetHeight = 512;
  } else if (preset === 'square') {
    targetWidth = 512;
    targetHeight = 512;
  } else {
    const scale = 0.5;
    targetWidth = width * scale;
    targetHeight = height * scale;
  }

  let newWidth = ensureMinMultiple(
    alignDownToMultiple(Math.round(targetWidth), MULTIPLE),
    MULTIPLE,
  );
  let newHeight = ensureMinMultiple(
    alignDownToMultiple(Math.round(targetHeight), MULTIPLE),
    MULTIPLE,
  );

  if (newWidth === width && newHeight === height) {
    return { width, height, limited: false, originalWidth, originalHeight };
  }

  return {
    width: newWidth,
    height: newHeight,
    limited: true,
    originalWidth,
    originalHeight,
  };
}
