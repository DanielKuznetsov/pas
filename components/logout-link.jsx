// components/logout-link.tsx
'use client'

import { Button } from '@/components/ui/button'
import { SignOutButton } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'

export default function LogoutLink() {
    return (
        <SignOutButton redirectUrl="/">
            <Button type="button" variant="outline" className="w-full flex items-center justify-center gap-[6px]">
                <LogOut size={14} className="mt-[1px]" />
                <span className="leading-7">Sign out</span>
            </Button>
        </SignOutButton>
    )
}
