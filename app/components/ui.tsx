import { type ButtonHTMLAttributes, type DetailedHTMLProps, type ReactNode, forwardRef } from "react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const Button = forwardRef<HTMLButtonElement, DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "default";
}>(function Button({ className, variant = "default", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn("button", variant !== "default" && variant, className)}
      {...props}
    />
  );
});

export function Badge({ variant = "neutral", children, className }: { variant?: "success" | "warning" | "danger" | "neutral"; children: ReactNode; className?: string }) {
  return <span className={cn("badge", variant, className)}>{children}</span>;
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description ? <p className="intro">{description}</p> : null}
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </header>
  );
}

export function Card({ title, subtitle, headerExtra, children, className }: { title?: ReactNode; subtitle?: ReactNode; headerExtra?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <article className={cn("card", className)}>
      {(title || subtitle || headerExtra) && (
        <div className="card-header">
          <div>
            {title ? <h3 className="card-title">{title}</h3> : null}
            {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
          </div>
          {headerExtra}
        </div>
      )}
      {children}
    </article>
  );
}

export function EmptyState({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {description ? <p className="intro" style={{ margin: "0 auto", maxWidth: 440 }}>{description}</p> : null}
      {action ? <div style={{ marginTop: 18 }}>{action}</div> : null}
    </div>
  );
}

export interface TimelineItem {
  title: ReactNode;
  description?: ReactNode;
  timestamp?: ReactNode;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="timeline">
      {items.map((item, idx) => (
        <div key={idx} className="timeline-item">
          <span className="timeline-marker" />
          <div className="timeline-content">
            <strong>{item.title}</strong>
            {item.description ? <div style={{ marginTop: 6, color: "var(--text-secondary)", fontSize: 14 }}>{item.description}</div> : null}
            {item.timestamp ? <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>{item.timestamp}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PropertyList({ items, columns = 1 }: { items: Array<{ label: ReactNode; value: ReactNode }>; columns?: 1 | 2 }) {
  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: columns === 2 ? "repeat(auto-fit, minmax(220px, 1fr))" : "1fr",
        gap: "10px 22px",
        margin: 0
      }}
    >
      {items.map((item, idx) => (
        <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <dt style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>{item.label}</dt>
          <dd style={{ margin: 0, fontSize: 15 }}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
