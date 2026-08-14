export default function LinktreeLogo({ className = "", iconSize = "w-6 h-6", textSize = "text-lg", showText = true }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg 
        className={`${iconSize} text-emerald-500 fill-current shrink-0`} 
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="m13.736 5.853 4.006-4.006 2.045 2.045-3.99 3.99a.412.412 0 0 0 .292.703h5.91v2.89h-5.91a.412.412 0 0 0-.292.702l3.99 3.991-2.045 2.045-4.006-4.006a.413.413 0 0 0-.703.292v5.49h-2.066v-5.49a.413.413 0 0 0-.703-.292l-4.006 4.006-2.045-2.045 3.99-3.991a.412.412 0 0 0-.292-.702h-5.91v-2.89h5.91a.412.412 0 0 0 .292-.702l-3.99-3.99 2.045-2.046 4.006 4.006c.188.188.514.055.514-.212V.5h2.066v5.061c0 .267.326.4.514.212z"/>
      </svg>
      {showText && (
        <span className={`${textSize} font-extrabold text-slate-900 tracking-tight`}>
          Linktree
        </span>
      )}
    </div>
  );
}
