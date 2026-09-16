export interface WatermarkOptions {
  employeeName: string;
  employeeId: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp?: string;
  visitName?: string;
}

/**
 * Captures the current frame of a video element onto a canvas,
 * stamps an anti-tamper watermark with GPS & Timestamp metadata,
 * and exports as a JPEG data URL.
 */
export function captureFrameWithWatermark(
  videoElement: HTMLVideoElement,
  options: WatermarkOptions
): string {
  const canvas = document.createElement('canvas');
  const videoWidth = videoElement.videoWidth || 1280;
  const videoHeight = videoElement.videoHeight || 720;

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Draw video frame
  ctx.drawImage(videoElement, 0, 0, videoWidth, videoHeight);

  // Watermark styling
  const timeStr = options.timestamp 
    ? new Date(options.timestamp).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' })
    : new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' });

  const latStr = options.latitude !== undefined ? options.latitude.toFixed(6) : 'N/A';
  const lngStr = options.longitude !== undefined ? options.longitude.toFixed(6) : 'N/A';
  const accStr = options.accuracy !== undefined ? `±${Math.round(options.accuracy)}m` : 'N/A';

  // Bottom semi-transparent overlay
  const bannerHeight = Math.max(70, Math.floor(videoHeight * 0.12));
  const gradient = ctx.createLinearGradient(0, videoHeight - bannerHeight - 20, 0, videoHeight);
  gradient.addColorStop(0, 'rgba(15, 23, 42, 0)');
  gradient.addColorStop(0.3, 'rgba(15, 23, 42, 0.75)');
  gradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, videoHeight - bannerHeight - 20, videoWidth, bannerHeight + 20);

  // Red/Green badge indicator on bottom-left
  const badgeSize = Math.max(12, Math.floor(videoHeight * 0.02));
  ctx.fillStyle = '#22c55e'; // Green verified dot
  ctx.beginPath();
  ctx.arc(24, videoHeight - bannerHeight + 14, badgeSize / 2, 0, Math.PI * 2);
  ctx.fill();

  // Primary text: Employee ID & Name
  const fontSize = Math.max(14, Math.floor(videoWidth * 0.022));
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(
    `[LIVE CAMERA] ${options.employeeId} - ${options.employeeName}`,
    36 + badgeSize,
    videoHeight - bannerHeight + 18
  );

  // Secondary text: Lat, Lng, Accuracy, Timestamp
  const subFontSize = Math.max(11, Math.floor(fontSize * 0.8));
  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 ${subFontSize}px "JetBrains Mono", monospace`;
  const metaText = `GPS: ${latStr}, ${lngStr} (${accStr}) | ${timeStr}`;
  ctx.fillText(
    metaText,
    24,
    videoHeight - bannerHeight + 24 + fontSize
  );

  if (options.visitName) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = `600 ${subFontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(
      `VISIT: ${options.visitName}`,
      24,
      videoHeight - 12
    );
  }

  // Generate JPEG base64 (0.85 quality for good clarity and light payload)
  return canvas.toDataURL('image/jpeg', 0.85);
}
