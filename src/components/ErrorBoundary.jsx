import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Loggear si se desea enviar a Sentry u otro
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-red-700 bg-red-50 border border-red-200 rounded-md m-4">
          <h2 className="font-semibold mb-2">Ha ocurrido un error en la interfaz</h2>
          <p className="text-sm mb-4">
            Intenta recargar la página. Si el problema persiste, contacta al soporte.
          </p>
          {import.meta.env.DEV && (
            <pre className="text-xs whitespace-pre-wrap">{String(this.state.error)}</pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
