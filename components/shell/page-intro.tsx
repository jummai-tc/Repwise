/** Page-level heading block used inside the content area. */
export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
      <div className="min-w-0">
        {eyebrow && <p className="text-label mb-1.5">{eyebrow}</p>}
        <h2 className="text-page-title">{title}</h2>
        {description && (
          <p className="text-caption mt-1.5 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
