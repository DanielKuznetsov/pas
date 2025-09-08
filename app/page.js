import { SignedIn, SignedOut } from "@clerk/nextjs"
import DBButton from "@/components/db_button"
import StripeUI from "@/components/stripe_ui"

export default function Home() {
  return (
    <div className="flex gap-4 p-4">
      <SignedIn>
        <StripeUI />
      </SignedIn>

      <SignedOut>
        <p>Marketing Page</p>
      </SignedOut>
    </div>
  )
}
