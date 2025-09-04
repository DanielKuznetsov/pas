// components/TodoListener.jsx
'use client'

import { useEffect, useRef, useState } from 'react'
import supabase from '@/utils/supabase/client' // createBrowserClient instance

export default function TodoListener() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const audioRef = useRef(null)

  // one function to (re)load the list
  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching todos:', error)
      return
    }
    setTodos(data ?? [])
  }

  useEffect(() => {
    let unsubscribed = false

    // initial load
    ;(async () => {
      setLoading(true)
      await fetchTodos()
      if (!unsubscribed) setLoading(false)
    })()

    // subscribe to realtime changes
    const channel = supabase
      .channel('realtime:todos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos' },
        async (_payload) => {
          // play chime (clone so rapid events can overlap)
          if (audioRef.current) {
            const snd = audioRef.current.cloneNode()
            snd.play().catch(() => {})
          }

          // simplest: refetch the whole list
          await fetchTodos()

          // optional: for smoother UX, patch locally using _payload instead of full refetch
        }
      )
      .subscribe()

    return () => {
      unsubscribed = true
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <>
      {/* audio asset in /public/chime.mp3 */}
      <audio ref={audioRef} src="/chime.mp3" preload="auto" />

      {loading && <div>Loading…</div>}
      {!loading && todos.map((todo) => (
        <div key={todo.id}>
          <h1>{todo.name}</h1>
        </div>
      ))}
    </>
  )
}
