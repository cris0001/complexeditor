import type { Metadata } from 'next';
import { Playground } from './Playground';

export const metadata: Metadata = {
  title: 'Playground — complexeditor',
  description: 'Try the block editor in your browser. Nothing is saved on a server.',
};

export default function PlaygroundPage() {
  return <Playground />;
}
