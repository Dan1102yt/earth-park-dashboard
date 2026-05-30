export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-8">
      <div className="min-w-0">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-gray-400 mt-1 text-sm">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0 w-full sm:w-auto">{action}</div>}
    </div>
  );
}
