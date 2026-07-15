import styles from './Button.module.css'

const VARIANT_CLASS = {
  primary: styles['btn-primary'],
  ghost: styles['btn-ghost'],
  soft: styles['btn-soft'],
  warn: styles['btn-warn'],
}

export default function Button({ variant = 'primary', size = 'md', className, children, ...rest }) {
  const classes = [
    styles.btn,
    VARIANT_CLASS[variant] || VARIANT_CLASS.primary,
    size === 'sm' ? styles['btn-sm'] : null,
    className,
  ].filter(Boolean).join(' ')

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}
