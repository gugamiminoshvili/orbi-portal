import styles from './Checkbox.module.css'

// A themed checkbox. Same props as <input type="checkbox">; the only reason
// it exists is that the native control paints itself in the OS accent colour
// and can't be told to follow the brand palette or the dark theme.
export default function Checkbox({ className = '', ...rest }) {
  return <input type="checkbox" className={`${styles.cb} ${className}`.trim()} {...rest} />
}
