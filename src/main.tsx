import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./theme/styles.css";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error(error, info);
  }
  render() {
    return this.state.failed ? (
      <div className="empty-state">
        <h1>Something interrupted Lumo.</h1>
        <p>Your last saved meeting can be recovered after reloading.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload application
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
