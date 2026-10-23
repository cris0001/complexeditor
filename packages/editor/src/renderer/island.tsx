import { Island, type IslandName, type IslandOptions } from 'complexeditor/renderer/client';
import type { RenderContext } from '../core/types';

/**
 * Client island for interactive blocks. Not rendered inside the editor canvas, where React owns
 * the DOM and the editor provides its own preview behavior.
 */
export function island(ctx: Pick<RenderContext, 'mode'>, name: IslandName, options?: IslandOptions) {
  if (ctx.mode === 'editor') return null;
  return <Island name={name} options={options} />;
}
