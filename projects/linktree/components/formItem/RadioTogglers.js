import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
const RadioTogglers = ({ options, defaultValue, onChange }) => {
  return (
    <div className="radio-togglers shadow">
      {options.map(option => (
        <label key={option.value}>
          <input 
            type="radio" 
            checked={defaultValue === option.value} 
            name="bgType" 
            onChange={ev => { onChange(ev.target.value) }} 
            value={option.value} 
          />
          <div>
            <FontAwesomeIcon icon={option.icon} />
            <span>{option.label}</span>
          </div>
        </label>
      ))}
    </div>
  )
}

export default RadioTogglers