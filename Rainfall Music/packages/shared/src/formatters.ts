/**
 * Formatting helpers for duration, timestamps, progress bars, and track names
 */

export function formatDuration(ms: number): string {
  if (isNaN(ms) || ms < 0) return '00:00';
  if (ms >= 360000000) return 'Live Stream'; // Over 100 hours or live stream

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${paddedMinutes}:${paddedSeconds}`;
}

export function createProgressBar(
  current: number,
  total: number,
  size: number = 16,
  charEmpty: string = '▬',
  charFilled: string = '🔘'
): string {
  if (total <= 0) return '🔘' + charEmpty.repeat(size - 1);

  const progress = Math.min(Math.max(current / total, 0), 1);
  const position = Math.round(progress * (size - 1));

  const before = charEmpty.repeat(position);
  const after = charEmpty.repeat(size - 1 - position);

  return `${before}${charFilled}${after}`;
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function cleanString(input: string): string {
  return input.replace(/[`*~_]/g, '\\$&');
}

