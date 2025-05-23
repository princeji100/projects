'use client';
import { useFormStatus } from "react-dom";

const SubmitButton = ({ children, className = '' }) => {
    const { pending } = useFormStatus();
    
    return (
        <button 
            type='submit' 
            disabled={pending} 
            className={`
                flex justify-center items-center gap-2 
                px-6 py-2.5 rounded-lg font-medium
                bg-blue-600 hover:bg-blue-700 
                text-white shadow-sm
                disabled:bg-blue-400 disabled:cursor-not-allowed
                transition-all duration-200
                ${className}
            `}
        >
            {pending ? (
                <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle 
                            className="opacity-25" 
                            cx="12" cy="12" r="10" 
                            stroke="currentColor" 
                            strokeWidth="4"
                            fill="none"
                        />
                        <path 
                            className="opacity-75" 
                            fill="currentColor" 
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                    </svg>
                    <span>Saving...</span>
                </div>
            ) : (
                children
            )}
        </button>
    )
}

export default SubmitButton