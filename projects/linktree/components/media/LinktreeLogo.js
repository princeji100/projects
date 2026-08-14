import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';

export default function LinktreeLogo({ className = "", boxSize = "w-8 h-8", iconSize = "text-sm", textSize = "text-lg", showText = true }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`${boxSize} rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0`}>
        <FontAwesomeIcon icon={faLink} className={iconSize} />
      </div>
      {showText && (
        <span className={`${textSize} font-bold text-slate-900 tracking-tight`}>
          Linktree
        </span>
      )}
    </div>
  );
}

