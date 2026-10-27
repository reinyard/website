import { Field } from './field';
import { tracked } from './tracked';

export function start() {
  const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-scene="tracked"]');
  if (!canvas) return;
  new Field(canvas, tracked);
  requestAnimationFrame(() => canvas.classList.add('on'));
}
