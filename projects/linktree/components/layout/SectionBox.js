const SectionBox = ({ children, className = '' }) => {
  return (
    <div className={`
      bg-white 
      rounded-xl
      border border-slate-100
      shadow-sm
      p-6 md:p-8 
      ${className}
    `}>
      {children}
    </div>
  )
}

export default SectionBox