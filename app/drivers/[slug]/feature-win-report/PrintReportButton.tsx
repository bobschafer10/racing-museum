'use client'

import styles from './feature-win-report.module.css'

export default function PrintReportButton() {
  return (
    <button type="button" className={styles.printButton} onClick={() => window.print()}>
      Print / Save PDF
    </button>
  )
}
