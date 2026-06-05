type ModuleGridProps = {
  modules: string[];
};

export function ModuleGrid({ modules }: ModuleGridProps) {
  return (
    <div className="module-grid">
      {modules.map((module) => (
        <div className="module-card" key={module}>
          <strong>{module}</strong>
          <p>Placeholder boundary for later implementation phases.</p>
        </div>
      ))}
    </div>
  );
}
