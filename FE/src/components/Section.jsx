import './Section.css'

/**
 * Titled content block with optional trailing action.
 *
 * @param {{ title: string, subtitle?: string, action?: import('react').ReactNode, bleed?: boolean, children: any }} props
 */
export function Section({ title, subtitle, action, bleed = false, children }) {
  return (
    <section className="section" data-bleed={bleed ? 'true' : undefined}>
      <header className="section__head">
        <div className="section__titles">
          <h2 className="section__title">{title}</h2>
          {subtitle && <p className="section__sub">{subtitle}</p>}
        </div>
        {action && <div className="section__action">{action}</div>}
      </header>
      {children}
    </section>
  )
}
