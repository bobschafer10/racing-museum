import type { ReactNode } from 'react'
import ArchiveAcknowledgmentModal from '@/components/ArchiveAcknowledgmentModal'
import HistoricalArchiveNotice from '@/components/HistoricalArchiveNotice'

type HistoricalArchiveGateProps = {
  children: ReactNode
  showPageNotice?: boolean
}

export default function HistoricalArchiveGate({
  children,
  showPageNotice = true,
}: HistoricalArchiveGateProps) {
  return (
    <>
      <ArchiveAcknowledgmentModal />

      {showPageNotice && <HistoricalArchiveNotice />}

      {children}
    </>
  )
}