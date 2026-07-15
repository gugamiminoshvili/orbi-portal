import Icon from './Icon'
import styles from './Field.module.css'

export function Input({ className, ...rest }) {
  const classes = [styles.input, className].filter(Boolean).join(' ')
  return <input className={classes} {...rest} />
}

export function SearchField({ className, inputClassName, ...rest }) {
  const classes = [styles['search-wrap'], className].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      <Icon name="search" />
      <Input className={inputClassName} {...rest} />
    </div>
  )
}

export default function Field({ label, htmlFor, className, children, ...rest }) {
  const classes = [styles.field, className].filter(Boolean).join(' ')
  return (
    <div className={classes} {...rest}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
    </div>
  )
}
