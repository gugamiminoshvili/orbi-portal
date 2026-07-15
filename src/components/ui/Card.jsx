import styles from './Card.module.css'

function Card({ className, children, ...rest }) {
  const classes = [styles.card, className].filter(Boolean).join(' ')
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}

function Head({ className, children, sub, ...rest }) {
  const classes = [styles['card-head'], className].filter(Boolean).join(' ')
  return (
    <div className={classes} {...rest}>
      {children}
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  )
}

function Pad({ className, children, ...rest }) {
  const classes = [styles['card-pad'], className].filter(Boolean).join(' ')
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}

Card.Head = Head
Card.Pad = Pad

export default Card
