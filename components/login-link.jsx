import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function LoginLink() {
    return (
        <div className="flex gap-2">
            <Button variant="outline">
                <Link href="/auth/login">Login</Link>
            </Button>

            <Button variant="outline">
                <Link href="/auth/signup">Signup</Link>
            </Button>
        </div>
    )
}
