import DBButton from "@/components/db_button"
import StripeUI from "@/components/stripe_ui"

export default function Home() {
  return (
    <div className="font-sans items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      {/* <DBButton /> */}

      <StripeUI />
    </div>
  );
}
