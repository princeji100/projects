import { useEffect, useState } from "react"

const useFetch = <T>(fetchFunction:()=> Promise<T>, autoFetch = true)=>{
    const [data,SetData] = useState<T | null>(null);
    const [loading,SetLoading] = useState(false);
    const [error,SetError] = useState<Error | null>(null);
    const fetchData = async ()=>{
        try{
            SetLoading(true);
            SetError(null);

            const result = await fetchFunction();
            SetData(result);
        }catch(error){
            SetError(error instanceof Error ? error : new Error('An Error Ouccured'));
        }finally{
            SetLoading(false);
        }
    }
    const reset = ()=>{
        SetData(null);
        SetError(null);
        SetLoading(false);
    }
    useEffect(()=>{
        if(autoFetch){
            fetchData();
        }
    },[]);
    return {data,loading,error,refetch:fetchData,reset};
}
export default useFetch