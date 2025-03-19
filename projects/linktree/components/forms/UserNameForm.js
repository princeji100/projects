'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import handleFormSubmit from '@/action/grabusername';
import UserNameFormResult from '@/components/formResults/UserNameFormResult';
import SubmitButton from '../buttons/SubmitButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';

const UserNameForm = () => {
  const [username, setUsername] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const onSubmit = async (event) => {
    event.preventDefault();
    const formdata = new FormData(event.target);
    
    event.target.reset();

    try {
      const result = await handleFormSubmit(formdata);
      setUsername(!result.success);
      if (result) {
        router.push('/account?created=' + formdata.get('username'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-md mx-auto p-6">
      <h1 className="text-4xl font-bold text-slate-800 text-center mb-4">
        Grab Your Username
      </h1>
      <p className="text-center mb-8 text-slate-600 leading-relaxed">
        Choose a unique username for your Linktree profile
      </p>
      
      <div className="max-w-xs mx-auto space-y-4">
        <div className="relative">
          <input 
            className="block w-full px-4 py-3 rounded-lg border border-slate-200 
                     text-center text-slate-700 font-medium
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-all duration-200 placeholder:text-slate-400"
            defaultValue={searchParams.get('Choiceusername')}
            type="text"
            name="username"
            placeholder="Enter username"
            spellCheck={false}
            autoComplete="off"
          />
          {username && (
            <div className="mt-2">
              <UserNameFormResult />
            </div>
          )}
        </div>

        <SubmitButton className="w-full">
          <span className="text-base">Claim your username</span>
          <FontAwesomeIcon 
            icon={faArrowRight} 
            className="text-lg transition-transform group-hover:translate-x-1" 
          />
        </SubmitButton>
      </div>
    </form>
  );
};

export default UserNameForm;