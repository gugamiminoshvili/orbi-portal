import Icon from './Icon'
import styles from './EmptyState.module.css'

export default function EmptyState({ icon = 'empty', title, children, className, ...rest }) {
  const classes = [styles.empty, className].filter(Boolean).join(' ')
  return (
    <div className={classes} {...rest}>
      <div className={styles.ei}>
        <Icon name={icon} />
      </div>
      {title && <div>{title}</div>}
      {children}
    </div>
  )
}
