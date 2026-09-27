import { Component, type ReactNode } from 'react';

export class ExperienceBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error) {
    console.error('The capability lab could not render.', error);
  }

  render() {
    if (this.state.failed) return <section className="audit-page" role="alert">
      <h1 tabIndex={-1}>The capability lab could not open</h1>
      <p>Reload to try again. This did not change your assessment or clear your saved lab progress.</p>
      <div className="button-row"><button type="button" className="button button-secondary" onClick={() => window.location.reload()}>Reload the lab</button><a href="#assessment">Return to the assessment</a></div>
    </section>;
    return this.props.children;
  }
}

export class IllustrationBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error) {
    console.error('A workplace illustration could not render. Semantic mission controls remain available.', error);
  }

  render() {
    if (this.state.failed) return <span className="lab-art-unavailable">Illustration unavailable. The activity still works.</span>;
    return this.props.children;
  }
}
