'use client'

import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { useClerk } from '@clerk/nextjs'

export default function LogoutLink() {
    const { signOut } = useClerk()

    return (
        <Button onClick={() => signOut({ redirectUrl: '/' })} variant="outline" className="w-full flex items-center justify-center gap-[6px]">
            <LogOut size={14} className="mt-[1px]" />
            <span className="leading-7">Sign out</span>
        </Button>
    )
}