import { getLimitMode } from "../services/settingsService.js";

const MAX_SIDE = 1024;
const MULTIPLE = 64;

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
  height: number
): LimitedSizeResult {
  const originalWidth = width;
  const originalHeight = height;

  if (!isLimitModeEnabled()) {
    return { width, height, limited: false, originalWidth, originalHeight };
  }

  if (width <= MAX_SIDE && height <= MAX_SIDE) {
    return { width, height, limited: false, originalWidth, originalHeight };
  }

  const scale = Math.min(MAX_SIDE / width, MAX_SIDE / height);
  let newWidth = Math.floor((width * scale) / MULTIPLE) * MULTIPLE;
  let newHeight = Math.floor((height * scale) / MULTIPLE) * MULTIPLE;

  // 确保不会缩到 0
  if (newWidth < MULTIPLE) newWidth = MULTIPLE;
  if (newHeight < MULTIPLE) newHeight = MULTIPLE;

  return {
    width: newWidth,
    height: newHeight,
    limited: true,
    originalWidth,
    originalHeight,
  };
}
