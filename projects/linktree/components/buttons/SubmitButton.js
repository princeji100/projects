'use client';
import { useFormStatus } from "react-dom";

const SubmitButton = ({ children, className }) => {
    const status = useFormStatus();
    return (
        <button type='submit' disabled={status.pending} className={`flex cursor-pointer disabled:bg-blue-400 justify-center items-center gap-2 bg-blue-500 text-white py-2 px-4 w-full ` + className}>
            {status.pending && <span> Saving...</span>}
            {!status.pending && <>{children}</>}
        </button>
    )
}

export default SubmitButton