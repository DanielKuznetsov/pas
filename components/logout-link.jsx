import { Button } from "@/components/ui/button"
import { SignOutButton } from "@clerk/nextjs"
import { LogOut } from "lucide-react"

export default async function LogoutLink() {
    return (
        <SignOutButton redirectUrl="/">
            <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-[6px]"
            >
                <LogOut size={14} className="mt-[1px]" />
                <p className="leading-7">Signout</p>
            </Button>
        </SignOutButton>
    )
}