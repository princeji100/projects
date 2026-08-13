const UserNameFormResult = ({ message = 'Username already taken' }) => {
  return (
    <div className="text-red-500 text-sm font-medium text-center mt-1 px-2 py-1 bg-red-50 rounded border border-red-100">
      {message}
    </div>
  );
};

export default UserNameFormResult;