const SectionBox = ({ children, className = '', title = '', action = null }) => {
  return (
    <section className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:overflow-visible print:border-slate-300 print:shadow-none print-break-inside-avoid ${className}`}>
      {(title || action) && (
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          {title && <h2 className="text-lg font-bold text-slate-800">{title}</h2>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6 md:p-8">
        {children}
      </div>
    </section>
  )
}

export default SectionBox