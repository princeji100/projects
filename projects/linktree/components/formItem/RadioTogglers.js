import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
const RadioTogglers = ({ options, defaultValue, onChange }) => {
  return (
    <div className="radio-togglers shadow">
      {options.map(option => (
        <label key={Math.random() * 1000}>
          <input type="radio" defaultChecked={defaultValue === option.value} name="bgType" onClick={ev => { onChange(ev.target.value) }} value={option.value} />
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