import { Button } from "@/components/ui/button"
import { Loader2 } from 'lucide-react'

export default function LoadingButton({
    isLoading,
    children,
    loadingText = "Loading...",
    buttonText = "Submit",
    variant = "default",
    ...props
}) {
    return (
        <Button {...props} disabled={isLoading} variant={variant}>
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
