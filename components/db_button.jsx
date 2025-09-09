'use client'

import { Button } from '@/components/ui/button'
import { testAction, getTodos } from '@/app/actions/test-actions'
import TodoListener from '@/components/TodoListener'
import { useState, useEffect } from 'react'

export default function DBButton() {


    const handleClick = async () => {
        const { data, error } = await testAction()

        if (error) {
            console.error('Error fetching data:', error)
        } else {
            console.log('Data:', data)

        }
    }

    // useEffect(() => {
    //     const fetchData = async () => {
    //         const { data, error } = await getTodos()

    //         if (error) {
    //             console.error('Error fetching data:', error)
    //         } else {
    //             setData(data)
    //         }
    //     }

    //     fetchData()
    // }, [])

    return (
        <>
            <Button onClick={handleClick}>Click me</Button>
            <TodoListener />
        </>
    )
}