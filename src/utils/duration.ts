/**
 * 将任务耗时毫秒数格式化为人类可读字符串
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms} ms`;
  }

  const seconds = ms / 1000;

  if (seconds < 60) {
    return `${seconds.toFixed(2)} 秒`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes - hours * 60;
    return `${hours} 小时 ${remainingMinutes} 分 ${remainingSeconds.toFixed(
      0,
    )} 秒`;
  }

  return `${minutes} 分 ${remainingSeconds.toFixed(1)} 秒`;
}
