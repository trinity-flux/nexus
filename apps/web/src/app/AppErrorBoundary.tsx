import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: (retry: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Stops one broken component from blanking the whole page.
 *
 * Still a class: React has no hook equivalent of `componentDidCatch`, and the
 * alternative — letting an exception unmount the entire tree — leaves the user
 * staring at white with no way back.
 */
export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // The console is the only sink today. When error reporting is added, this
    // is the single place it hooks into.
    console.error('Unhandled error in the React tree', error, info.componentStack);
  }

  private readonly retry = () => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback(this.retry);
    }

    return this.props.children;
  }
}
