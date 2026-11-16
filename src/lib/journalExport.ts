import { jsPDF } from 'jspdf';
import type { JournalCanvasElement } from '../types/mysphere';

export const CANVAS_WIDTH = 760;
export const CANVAS_HEIGHT = 920;

function parseLinearGradient(css: string): { angleDeg: number; stops: string[] } | null {
  if (!css.startsWith('linear-gradient(')) return null;
  const inner = css.slice('linear-gradient('.length, -1);
  const parts = inner.split(/,(?![^(]*\))/).map((s) => s.trim());
  if (parts.length < 2) return null;
  let angleDeg = 135;
  let startIdx = 0;
  if (parts[0].endsWith('deg')) {
    angleDeg = Number.parseFloat(parts[0]) || 135;
    startIdx = 1;
  }
  const stops = parts.slice(startIdx).map((stop) => stop.replace(/\s+\d+%$/, '').trim());
  return { angleDeg, stops };
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];
  for (const para of paragraphs) {
    if (!para) {
      lines.push('');
      continue;
    }
    const words = para.split(' ');
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

async function loadImageForCanvas(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function renderJournalToCanvas(params: {
  canvasBackground: string;
  canvasBorder: string;
  elements: JournalCanvasElement[];
}): Promise<HTMLCanvasElement> {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH * scale;
  canvas.height = CANVAS_HEIGHT * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  ctx.scale(scale, scale);

  // 1. Background
  const gradInfo = parseLinearGradient(params.canvasBackground);
  if (gradInfo && gradInfo.stops.length >= 2) {
    const rad = ((gradInfo.angleDeg - 90) * Math.PI) / 180;
    const x1 = CANVAS_WIDTH / 2 - Math.cos(rad) * (CANVAS_WIDTH / 2);
    const y1 = CANVAS_HEIGHT / 2 - Math.sin(rad) * (CANVAS_HEIGHT / 2);
    const x2 = CANVAS_WIDTH / 2 + Math.cos(rad) * (CANVAS_WIDTH / 2);
    const y2 = CANVAS_HEIGHT / 2 + Math.sin(rad) * (CANVAS_HEIGHT / 2);
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    gradInfo.stops.forEach((col, i) => {
      g.addColorStop(i / (gradInfo.stops.length - 1), col);
    });
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = params.canvasBackground || '#ffffff';
  }
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. Elements sorted by zIndex
  const sorted = [...params.elements].sort((a, b) => a.zIndex - b.zIndex);

  for (const el of sorted) {
    ctx.save();
    ctx.globalAlpha = el.opacity ?? 1;
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
    ctx.translate(-el.width / 2, -el.height / 2);

    if (el.type === 'shape') {
      const fill = el.backgroundColor || 'rgba(139, 92, 246, 0.15)';
      const stroke = el.borderColor || 'rgba(139, 92, 246, 0.5)';
      const strokeW = el.borderWidth ?? 1;
      if (el.shapeKind === 'circle') {
        ctx.beginPath();
        ctx.ellipse(
          el.width / 2,
          el.height / 2,
          el.width / 2,
          el.height / 2,
          0,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = fill;
        ctx.fill();
        if (strokeW > 0) {
          ctx.lineWidth = strokeW;
          ctx.strokeStyle = stroke;
          ctx.stroke();
        }
      } else if (el.shapeKind === 'line') {
        ctx.fillStyle = stroke;
        ctx.fillRect(0, el.height / 2 - Math.max(1, strokeW), el.width, Math.max(2, strokeW * 2));
      } else {
        const radius =
          el.shapeKind === 'badge'
            ? el.height / 2
            : el.shapeKind === 'rect'
              ? 0
              : el.borderRadius ?? 14;
        drawRoundedRectPath(ctx, 0, 0, el.width, el.height, radius);
        ctx.fillStyle = fill;
        ctx.fill();
        if (strokeW > 0) {
          ctx.lineWidth = strokeW;
          ctx.strokeStyle = stroke;
          ctx.stroke();
        }
      }
    } else if (el.type === 'image' && el.imageUrl) {
      const img = await loadImageForCanvas(el.imageUrl);
      const radius = el.borderRadius ?? 12;
      drawRoundedRectPath(ctx, 0, 0, el.width, el.height, radius);
      ctx.save();
      ctx.clip();
      if (img) {
        ctx.drawImage(img, 0, 0, el.width, el.height);
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.fillRect(0, 0, el.width, el.height);
      }
      ctx.restore();
      if ((el.borderWidth ?? 0) > 0) {
        drawRoundedRectPath(ctx, 0, 0, el.width, el.height, radius);
        ctx.lineWidth = el.borderWidth ?? 2;
        ctx.strokeStyle = el.borderColor || '#ffffff';
        ctx.stroke();
      }
    } else if (el.type === 'sticker' && el.stickerEmoji) {
      const size = el.fontSize || 44;
      ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.stickerEmoji, el.width / 2, el.height / 2);
    } else if (el.type === 'text' && el.text) {
      const fontSize = el.fontSize || 18;
      const weight = el.fontWeight === 'bold' ? '700' : el.fontWeight === 'semibold' ? '600' : '400';
      const style = el.fontStyle === 'italic' ? 'italic' : 'normal';
      const family = el.fontFamily || 'DM Sans, sans-serif';
      ctx.font = `${style} ${weight} ${fontSize}px ${family}`;
      ctx.fillStyle = el.color || '#0f172a';
      ctx.textBaseline = 'top';
      const align = el.textAlign || 'left';
      ctx.textAlign = align;

      const lines = wrapTextLines(ctx, el.text, Math.max(20, el.width - 12));
      const lineHeight = fontSize * 1.38;
      const xAnchor =
        align === 'center' ? el.width / 2 : align === 'right' ? el.width - 6 : 6;
      lines.forEach((line, idx) => {
        ctx.fillText(line, xAnchor, 6 + idx * lineHeight);
      });
    }

    ctx.restore();
  }

  // 3. Outer Border if set
  if (params.canvasBorder && params.canvasBorder !== 'none') {
    const match = params.canvasBorder.match(/^(\d+)px\s+(\w+)\s+(.+)$/);
    if (match) {
      const bw = Math.min(18, Number.parseInt(match[1], 10) || 2);
      const bstyle = match[2];
      const bcolor = match[3];
      ctx.save();
      ctx.lineWidth = bw;
      ctx.strokeStyle = bcolor;
      if (bstyle === 'dashed') ctx.setLineDash([10, 6]);
      ctx.strokeRect(bw / 2, bw / 2, CANVAS_WIDTH - bw, CANVAS_HEIGHT - bw);
      ctx.restore();
    }
  }

  return canvas;
}

export async function exportJournalAsPng(params: {
  title: string;
  canvasBackground: string;
  canvasBorder: string;
  elements: JournalCanvasElement[];
}): Promise<void> {
  const canvas = await renderJournalToCanvas(params);
  const dataUrl = canvas.toDataURL('image/png');
  const safeName = (params.title || 'mysphere-journal')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-|-$/g, '');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${safeName || 'mysphere-journal'}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function exportJournalAsPdf(params: {
  title: string;
  canvasBackground: string;
  canvasBorder: string;
  elements: JournalCanvasElement[];
}): Promise<void> {
  const canvas = await renderJournalToCanvas(params);
  const dataUrl = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [CANVAS_WIDTH, CANVAS_HEIGHT],
  });
  pdf.addImage(dataUrl, 'PNG', 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const safeName = (params.title || 'mysphere-journal')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-|-$/g, '');
  pdf.save(`${safeName || 'mysphere-journal'}.pdf`);
}
