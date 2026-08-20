import { LANGUAGES } from '../api/endpoints'
import { useLanguage } from '../LanguageContext'
import { Icon } from '../ui/Icon'
import './LanguagePicker.css'

/**
 * The one control over which language the trending shelves report on.
 *
 * It lives in the sidebar on desktop and on the home page itself below 821px,
 * where the sidebar is hidden — so both render this rather than two lookalikes
 * that could drift apart.
 *
 * @param {{ id?: string, label?: string, variant?: 'stacked'|'inline' }} props
 */
export function LanguagePicker({ id = 'language-picker', label = 'Trending language', variant = 'stacked' }) {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="lang-picker" data-variant={variant}>
      <label className="lang-picker__label" htmlFor={id}>
        {label}
      </label>
      <div className="lang-picker__field">
        <select
          id={id}
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          aria-label="Language for trending music"
        >
          {LANGUAGES.map((option) => (
            <option key={option} value={option}>
              {option[0].toUpperCase() + option.slice(1)}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={15} />
      </div>
    </div>
  )
}
