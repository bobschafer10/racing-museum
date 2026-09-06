import styles from './state-shell.module.css'

export default function StateTracksLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.scope}>{children}</div>
}
