import { Button } from "@/components/ui/button"
import { Loader2 } from 'lucide-react'

export default function LoadingButton({
    isLoading,
    children,
    loadingText = "Loading...",
    buttonText = "Submit",
    ...props
}) {
    return (
        <Button {...props} disabled={isLoading}>
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {loadingText}
                </>
            ) : (
                <>
                    {buttonText}
                </>
            )}
        </Button>
    )
}
