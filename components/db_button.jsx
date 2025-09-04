'use client'

import { Button } from '@/components/ui/button'
import { testAction } from '@/app/actions/test-actions'

export default function DBButton() {

    const handleClick = async () => {
        const { data, error } = await testAction()

        if (error) {
            console.error('Error fetching data:', error)
        } else {
            console.log('Data:', data)
        }
    }

    return (
        <Button onClick={handleClick}>Click me</Button>
    )
}