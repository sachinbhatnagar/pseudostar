import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="loading-app">
        <section>
          <h1>The app could not finish loading.</h1>
          <p>Reload to try again. Saved drafts will be restored from this device.</p>
          <button className="primary" onClick={() => window.location.reload()}>
            Reload PseudoStar
          </button>
        </section>
      </main>
    ) : (
      this.props.children
    );
  }
}
