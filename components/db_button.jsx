'use client'

import { Button } from '@/components/ui/button'
import { testAction, getTodos } from '@/app/actions/test-actions'
import TodoListener from '@/components/TodoListener'
import { useState, useEffect } from 'react'    

export default function DBButton() {
    const [data, setData] = useState(null)

    const handleClick = async () => {
        const { data, todos, error } = await testAction()

        if (error) {
            console.error('Error fetching data:', error)
        } else {
            console.log('Data:', data)
            setData(todos)
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            const { data, error } = await getTodos()

            if (error) {
                console.error('Error fetching data:', error)
            } else {
                setData(data)
            }
        }

        fetchData()
    }, [])

    return (
        <>
            <Button onClick={handleClick}>Click me</Button>
            <TodoListener />
            
            {data && data.map((item) => (
                <div key={item.id}>
                    <h1>{item.name}</h1>
                </div>
            ))}
        </>
    )
}