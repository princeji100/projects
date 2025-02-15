import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import bgDesktopDark from './assets/images/bg-desktop-dark.jpg';
import bgDesktopLight from './assets/images/bg-desktop-light.jpg';
import moonIcon from './assets/images/icon-moon.svg';
import sunIcon from './assets/images/icon-sun.svg';
import check from './assets/images/icon-check.svg';
import iconPencil from './assets/images/icon-pencil.svg';
import iconCross from './assets/images/icon-cross.svg';

function App() {
  const [todo, setTodo] = useState('');
  const [todos, setTodos] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const inputRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const todoString = localStorage.getItem('todos');
    if (todoString) {
      const todos = JSON.parse(todoString);
      setTodos(todos);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const handleChange = (e) => {
    setTodo(e.target.value);
  };

  const handleAdd = (e) => {
    if (e.key === 'Enter' && todo.trim() !== '') {
      setTodos([...todos, { id: uuidv4(), todo, isChecked: false }]);
      setTodo('');
      inputRef.current.value = '';
    }
  };

  const handleEdit = (e) => {
    const id = e.currentTarget.parentElement.parentElement.parentElement.children[0].id;
    const t = todos.filter(item => item.id === id);
    inputRef.current.value = t[0].todo;
    const newTodos = todos.filter(item => item.id !== id);
    setTodos(newTodos);
    inputRef.current.focus();
  };

  const handleDelete = (e) => {
    const id = e.currentTarget.parentElement.parentElement.parentElement.children[0].id;
    const newTodos = todos.filter(item => item.id !== id);
    setTodos(newTodos);
  };

  const handleCheck = (e) => {
    const id = e.currentTarget.id;
    const index = todos.findIndex(item => item.id === id);
    const newTodos = [...todos];
    newTodos[index].isChecked = !newTodos[index].isChecked;
    setTodos(newTodos);
  };

  const getFilteredTodos = () => {
    switch (filterType) {
      case 'active':
        return todos.filter(item => !item.isChecked);
      case 'completed':
        return todos.filter(item => item.isChecked);
      default:
        return todos;
    }
  };

  const itemleft = todos.filter(item => !item.isChecked).length;
  const clearCompleted = () => {
    const remaintodos = todos.filter(item => !item.isChecked);
    setTodos(remaintodos);
  };
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };
  let ko = false;
  return (
    <>
      <div className={`bg-no-repeat select-none ${isDarkMode ? 'bg-[#161722]' : 'bg-[#e4e5f1]'} bg-contain h-[100vh]`} style={{ backgroundImage: `url(${isDarkMode ? bgDesktopDark : bgDesktopLight})` }}>
        <div className='fixed flex flex-col gap-7 top-[10%] left-1/2 -translate-x-1/2 w-2/5 min-h-[40vh]'>
          <div className='flex items-center justify-between'>
            <h1 className='text-white text-5xl uppercase font-semibold tracking-[20px]'>Todo</h1>
            <img className='object-contain w-8 cursor-pointer' src={isDarkMode ? sunIcon : moonIcon} alt="theme toggle" onClick={toggleTheme} />
          </div>
          <div className={`flex items-center h-12 ${isDarkMode ? 'bg-[#25273c]' : 'bg-[#fafafa]'} px-6 w-full rounded-md`} onClick={() => inputRef.current.focus()}>
            <div className={`w-6 h-6 border ${isDarkMode?'border-[#42455f]':'border-[#e4e5f1]'} flex items-center justify-center rounded-full hover:cursor-pointer ${ko ? 'bg-gradient-to-r from-[#57ddff] to-[#c058f3]' : ''}`} onKeyUp={handleAdd}>{ko && <img src={check} className='' alt="tick" />}</div>
            <input ref={inputRef} autoFocus type="text" onChange={handleChange} placeholder='Create a new todo...' onKeyUp={handleAdd} className={`w-full h-6 focus:outline-none pl-6 text-2xl ${isDarkMode?'text-[#d3d4e0]':'text-[#484b6a]'}`} />
          </div>
          <div className={`flex flex-col ${isDarkMode ? 'bg-[#25273c] shadow-xl shadow-black' : 'bg-[#fafafa]'} h-fit min-h-[60vh] overflow-auto rounded-md`}>
            {getFilteredTodos().map(item => (
              <div key={item.id} className={`group flex items-center  h-16 ${isDarkMode ? 'bg-[#25273c] border-[#42455f]' : 'bg-[#fafafa] border-[#e4e5f1]'} border-b w-full px-6 rounded-md rounded-b-none`}>
                <div className={`w-6 h-6 ${item.isChecked ? '' : 'border'} ${isDarkMode ? 'border-[#343642]' : 'border-[#e4e5f1]'} flex items-center justify-center rounded-full hover:cursor-pointer transition hover:border-[#3a7bfd] ${item.isChecked ? 'bg-gradient-to-r from-[#57ddff] to-[#c058f3]' : ''}`} id={item.id} onClick={handleCheck}>{item.isChecked && <img src={check} alt="tick" />}</div>
                <div className='flex ml-6 justify-between w-full'>
                  <h1 className={`${item.isChecked ? "line-through" : ""} cursor-pointer ${isDarkMode?item.isChecked?'text-[#3a3d52]':'text-[#d3d4e0]':item.isChecked?'text-[#d3d4e0]':''} font-medium text-xl`}>{item.todo}</h1>
                  <div className='flex gap-4 mr-6'>
                    <img src={iconPencil} className='cursor-pointer text-red-500 transition group-hover:block hidden' onClick={handleEdit} alt="edit" />
                    <img src={iconCross} className='cursor-pointer transition group-hover:block hidden' onClick={handleDelete} alt="delete" />
                  </div>
                </div>
              </div>
            ))}
            <div className='flex h-16 mx-6 items-center justify-between'>
              <div className='text-[#9e9ea8] cursor-pointer'>{itemleft} item left</div>
              <div className='flex gap-5 text-[#9e9ea0] font-bold'>
                <div className={`${filterType === 'all' ? 'text-blue-600' : ''} cursor-pointer ${filterType !== 'all' ? isDarkMode?'hover:text-white':'hover:text-black' : ''}`} onClick={() => setFilterType('all')}>All</div>
                <div className={`${filterType === 'active' ? 'text-blue-600' : ''} cursor-pointer ${filterType !== 'active' ?isDarkMode?'hover:text-white':'hover:text-black' : ''}`} onClick={() => setFilterType('active')}>Active</div>
                <div className={`${filterType === 'completed' ? 'text-blue-600' : ''} cursor-pointer ${filterType !== 'completed' ? isDarkMode?'hover:text-white':'hover:text-black' : ''}`} onClick={() => setFilterType('completed')}>Completed</div>
              </div>
              <div className={`text-[#9e9ea8] cursor-pointer ${isDarkMode ? 'hover:text-white':'hover:text-black'}`} onClick={clearCompleted}>Clear Completed</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;