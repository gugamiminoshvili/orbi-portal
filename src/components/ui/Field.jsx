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

// `error` renders under the control and, because it is announced as an
// alert, reaches a screen reader without the user having to go looking for
// it. The field is also marked invalid so the styling has something to key
// off besides the message being present.
export default function Field({ label, htmlFor, error, className, children, ...rest }) {
  const classes = [styles.field, error ? styles.invalid : null, className]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={classes} {...rest}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error && (
        <p className={styles['field-error']} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
