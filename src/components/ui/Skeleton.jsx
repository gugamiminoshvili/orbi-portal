import styles from './Skeleton.module.css'

export default function Skeleton({ w, h, r, className, style, ...rest }) {
  const inline = {
    ...(w != null ? { width: w } : null),
    ...(h != null ? { height: h } : null),
    ...(r != null ? { borderRadius: r } : null),
    ...style,
  }
  const classes = [styles.sk, className].filter(Boolean).join(' ')
  return <div className={classes} style={inline} {...rest} />
}
