// components/TodoListener.jsx
'use client'

import { useEffect, useRef } from 'react'
import supabase from '@/utils/supabase/client'

export default function TodoListener() {
    const audioRef = useRef(null)

    useEffect(() => {
        const channel = supabase
            .channel('todos')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'todos' },
                (payload) => {
                    console.log('Change received!', payload)

                    // refresh page
                    window.location.reload()

                    // play chime (clone node so multiple events can overlap)
                    if (audioRef.current) {
                        const snd = audioRef.current.cloneNode()
                        snd.play().catch(() => { })
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel) // cleanup on unmount
        }
    }, [])

    return (
        <>
            {/* preload ensures audio is ready before first event */}
            <audio ref={audioRef} src="/chime.mp3" preload="auto" />
        </>
    )
}
