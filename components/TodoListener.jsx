// components/TodoListener.jsx
'use client'

import { useEffect } from 'react'
import supabase from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function TodoListener() {
  const router = useRouter()

  useEffect(() => {
    const channel = supabase
      .channel('todos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos' },
        (payload) => {
          console.log('Change received!', payload)
          // here you can call router.refresh() or update local state

          window.location.reload()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel) // cleanup on unmount
    }
  }, [])

  return null // it doesn't render anything
}
