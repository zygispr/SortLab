import { useEffect, useRef } from 'react';
import { getAlgorithm } from '../algorithms/registry';
import { createBarRenderer } from '../render/barRenderer';
import { player, useAppStore } from '../store/appStore';
import styles from './Visualizer.module.css';

/**
 * Canvas host for the bars. The renderer redraws on the player's frames; React only
 * updates the accessible label and the completion message.
 */
export function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const count = useAppStore((s) => s.dataset.original.length);
  const name = getAlgorithm(useAppStore((s) => s.algorithmId)).name;
  const position = useAppStore((s) => s.run.position);
  const total = useAppStore((s) => s.run.total);
  const finished = useAppStore((s) => s.run.status === 'finished');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createBarRenderer(canvas);
    const fit = () => {
      const { width, height } = canvas.getBoundingClientRect();
      renderer.resize(width, height, window.devicePixelRatio || 1);
      renderer.draw(player);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    const unsubscribe = player.subscribe(() => {
      renderer.draw(player);
    });
    fit();
    return () => {
      observer.disconnect();
      unsubscribe();
      renderer.dispose();
    };
  }, []);

  return (
    <div className={styles.visualizer}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label={`Bar chart of ${String(count)} values, sorting with ${name}, step ${position.toLocaleString()} of ${total.toLocaleString()}.`}
      />
      <p className={styles.message} aria-hidden={!finished}>
        {finished ? `Sorted with ${name}` : ' '}
      </p>
    </div>
  );
}
