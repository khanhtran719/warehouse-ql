import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="toolbar">
      <div>
        <h1 className="page-title">{title}</h1>
        <div className="page-subtitle">{subtitle}</div>
      </div>
      {actions}
    </div>
  );
}
