'use client'

import { EditorApp } from '@/components/EditorApp/EditorApp'
import { Node } from '@/lib/model'
import { store } from '@/store'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'

export const dynamic = 'force-static'

export default function Page() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { data, isLoading } = useQuery({
    queryKey: ['today', pathname],
    queryFn: async () => {
      return store.node.selectDailyNote(new Date(), false)
    },
    enabled: !!session?.userId && pathname === '/~/journals',
  })

  if (isLoading) return null
  const node = new Node(data!)
  return <EditorApp node={node}></EditorApp>
}
