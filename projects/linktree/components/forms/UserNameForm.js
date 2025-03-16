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
        router.push('/account?created=' + formdata.get('username')); // Redirect to the username page
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <h1 className='text-4xl font-bold text-center mb-6'>Grab Your username</h1>
      <p className='text-center mb-6 text-gray-500'>Choose your username</p>
      <div className='max-w-xs mx-auto'>
        <input className='block p-2 mx-auto bg-white w-full text-center mb-2' defaultValue={searchParams.get('Choiceusername')} type="text" name='username' placeholder='username' />
        {username && <UserNameFormResult />}
        <SubmitButton>
          <span>Claim your username</span>
          <FontAwesomeIcon className='text-xl' icon={faArrowRight} />
        </SubmitButton>
      </div>
    </form>
  );
};

export default UserNameForm;