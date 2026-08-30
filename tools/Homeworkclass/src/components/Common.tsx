import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import { CLASSES, SUBJECTS } from "../data/semester";
import type { ClassId, SubjectId } from "../types";

export function ClassBadge({ classId }: { classId: ClassId }) {
  const item = CLASSES[classId];
  return (
    <span
      className="class-badge"
      style={
        {
          "--class-accent": item.accent,
          "--class-soft": item.accentSoft,
          "--class-ink": item.ink,
        } as CSSProperties
      }
    >
      <span className="class-badge__dot" aria-hidden="true" />
      {item.shortLabel}
    </span>
  );
}

export function SubjectBadge({ subjectId }: { subjectId: SubjectId }) {
  return (
    <span className={`subject-badge subject-badge--${subjectId}`}>
      <span aria-hidden="true">
        {subjectId === "english" ? "A" : subjectId === "local" ? "地" : "♫"}
      </span>
      {SUBJECTS[subjectId].label}
    </span>
  );
}

export function Panel({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-heading__actions">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon = "✦",
  title,
  children,
}: PropsWithChildren<{ icon?: string; title: string }>) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        {icon}
      </span>
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
  tone = "violet",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "pink" | "orange" | "yellow" | "green" | "blue" | "violet";
}) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function InlineNotice({
  tone = "info",
  title,
  children,
}: PropsWithChildren<{
  tone?: "info" | "warning" | "success" | "danger";
  title: string;
}>) {
  return (
    <div className={`inline-notice inline-notice--${tone}`} role="status">
      <span className="inline-notice__icon" aria-hidden="true">
        {tone === "warning" ? "!" : tone === "success" ? "✓" : tone === "danger" ? "×" : "i"}
      </span>
      <div>
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Modal({
  title,
  description,
  onClose,
  children,
  labelledBy,
}: PropsWithChildren<{
  title: string;
  description?: string;
  onClose(): void;
  labelledBy: string;
}>) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-card__header">
          <div>
            <h2 id={labelledBy}>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="關閉視窗">
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
