import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">complexeditor</h1>
      <p className="mt-2 text-slate-600">Block-based content editor for React / Next.js.</p>
      <Link className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2 text-white" href="/playground">
        Open the playground
      </Link>
    </main>
  );
}
