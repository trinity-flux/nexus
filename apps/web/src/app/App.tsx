import { env } from '@/shared/config/env';

/**
 * Placeholder shell. The store, router, providers and layout land here in the
 * next phase; for now it exists so the toolchain has something real to build.
 */
export function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-6">
      <h1 className="font-semibold text-3xl text-fg tracking-tight">Trinity Nexus</h1>
      <p className="text-fg-muted">
        The community portal is being built. Data source:{' '}
        <code className="font-mono">{env.dataSource}</code>.
      </p>
    </main>
  );
}
