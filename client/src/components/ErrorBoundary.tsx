import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    /** Rendered instead of the children when a descendant throws. */
    fallback: (reset: () => void) => ReactNode;
}

interface State {
    error: Error | null;
}

/**
 * Q67: any render-time throw — including a failed lazy-chunk import after a redeploy —
 * used to blank the entire app with no message. `Suspense` had a fallback but no error
 * handling, so there was nothing between a thrown error and a white screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
    override state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    override componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('Unhandled render error:', error, info.componentStack);
    }

    private reset = (): void => {
        this.setState({ error: null });
    };

    override render(): ReactNode {
        if (this.state.error) return this.props.fallback(this.reset);
        return this.props.children;
    }
}
