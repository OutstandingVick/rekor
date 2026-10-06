import "./layout.css";

export function App() {
  return (
    <div className="app">
      <aside className="zone zone-config" aria-label="Curve configuration" />
      <main className="zone zone-stage" />
      <aside className="zone zone-side" aria-label="Simulate" />
      <footer className="zone zone-export" />
    </div>
  );
}
