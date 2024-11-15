'use client'

import { useSpace } from '@/app/(creator-fi)/hooks/useSpace'
import { SubscriptionRecordList } from '../../Space/SubscriptionRecordList'

export const dynamic = 'force-static'

export default function Page() {
  const { space } = useSpace()
  if (!space) return
  return <SubscriptionRecordList space={space} />
}
