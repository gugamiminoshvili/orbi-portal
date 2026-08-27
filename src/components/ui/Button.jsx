import styles from './Button.module.css'

const VARIANT_CLASS = {
  primary: styles['btn-primary'],
  ghost: styles['btn-ghost'],
  soft: styles['btn-soft'],
  warn: styles['btn-warn'],
}

// `as` lets the same button chrome render a router <Link> — a navigation
// that looks like a button still has to BE a link, so it opens in a new tab,
// shows its target, and reaches the keyboard the way links do.
export default function Button({ as: Tag = 'button', variant = 'primary', size = 'md', className, children, ...rest }) {
  const classes = [
    styles.btn,
    VARIANT_CLASS[variant] || VARIANT_CLASS.primary,
    size === 'sm' ? styles['btn-sm'] : null,
    className,
  ].filter(Boolean).join(' ')

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}
