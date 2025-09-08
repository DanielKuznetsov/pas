'use client'

import { useState } from "react"
import { useSignUp } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import LoadingButton from "@/components/loading-button"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp"
import Link from "next/link"
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

const formSchema = z.object({
    firstName: z.string().min(1, { message: "First name is required" }),
    lastName: z.string().min(1, { message: "Last name is required" }),
    email: z.string().email({ message: "Invalid email address" }),
})

const arrowRightIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18} color={"#fff"} fill={"none"}>
    <path d="M3 12L21 12M21 12L12.5 3.5M21 12L12.5 20.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
</svg>

export default function SignUpPage() {
    const router = useRouter()

    const [isLoading, setIsLoading] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [email, setEmail] = useState("")
    const [code, setCode] = useState("")
    const { isLoaded, signUp, setActive } = useSignUp()

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
        },
    })

    const resetState = () => {
        setVerifying(false)
        setEmail("")
        setCode("")
        form.reset({ firstName: "", lastName: "", email: "" })
    }

    async function onSubmit(values) {
        if (!isLoaded || !signUp) return

        setIsLoading(true)

        try {
            await signUp.create({
                firstName: values.firstName,
                lastName: values.lastName,
                emailAddress: values.email,
            })

            await signUp.prepareEmailAddressVerification({ strategy: "email_code" })

            setVerifying(true)
            setEmail(values.email)
            toast.success("Verification code sent to your email.")
        } catch (err) {
            // console.error("Error:", JSON.stringify(err, null, 2))
            toast.error(err.errors[0].longMessage)
        } finally {
            setIsLoading(false)
        }
    }

    async function handleVerification(e) {
        e.preventDefault()

        if (!isLoaded || !signUp) return

        setIsLoading(true)

        try {
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code,
            })

            if (completeSignUp.status !== "complete") {
                // console.log(JSON.stringify(completeSignUp, null, 2))
                throw new Error("Unable to complete signup")
            }

            if (completeSignUp.status === "complete") {
                await setActive({ session: completeSignUp.createdSessionId })
                toast.success("Account created successfully!")
                resetState()

                // Route upon successful sign-up
                router.push("/")
                router.refresh()
            }
        } catch (err) {
            // console.error("Error:", JSON.stringify(err, null, 2))
            toast.error("Verification failed. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleResendCode() {
        if (!isLoaded || !signUp) return

        try {
            await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
            toast.success("A new verification code has been sent to your email.")
        } catch (err) {
            // console.error("Error resending code:", JSON.stringify(err, null, 2))
            toast.error("Failed to resend verification code. Please try again.")
        }
    }

    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex-1 flex flex-col justify-center items-center p-4">
                <div className="w-full">
                    <div className="mb-8 absolute top-4 left-4">
                        <Button asChild variant="outline">
                            <Link href="/" className="flex items-center gap-2">
                                <ArrowLeft size={14} />
                                <span>Back to Homepage</span>
                            </Link>
                        </Button>
                    </div>

                    <motion.div
                        className="bg-white sm:p-8 p-6 rounded-lg shadow-authCard w-full max-w-md mx-auto"
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-semibold mb-2">
                                {verifying ? "Verify Your Email" : "Create an Account"}
                            </h1>
                            <p className="text-gray-600 text-sm">
                                {verifying
                                    ? `We've sent a verification code to ${email}.`
                                    : "Our users save up to 3 hours a week during recruitment times with Millo."}
                            </p>
                        </div>

                        <FormProvider {...form}>
                            {verifying ? (
                                <div className='space-y-4'>
                                    <form onSubmit={handleVerification}>
                                        <FormItem className="flex items-center justify-center mb-2">
                                            <FormControl>
                                                <InputOTP
                                                    maxLength={6}
                                                    value={code}
                                                    onChange={(value) => setCode(value)}
                                                >
                                                    <InputOTPGroup>
                                                        <InputOTPSlot index={0} />
                                                        <InputOTPSlot index={1} />
                                                        <InputOTPSlot index={2} />
                                                        <InputOTPSlot index={3} />
                                                        <InputOTPSlot index={4} />
                                                        <InputOTPSlot index={5} />
                                                    </InputOTPGroup>
                                                </InputOTP>
                                            </FormControl>
                                        </FormItem>

                                        <div className="text-center text-xs text-neutral-500 font-light mb-4">
                                            {code === "" ? (
                                                <>Enter your one-time password.</>
                                            ) : (
                                                <>You entered: {code}</>
                                            )}
                                        </div>

                                        <LoadingButton isLoading={isLoading} icon={arrowRightIcon} loadingText="Verifying..." buttonText="Verify" className="w-full" />
                                    </form>
                                    <Button
                                        variant="link"
                                        className="w-full text-sm"
                                        onClick={handleResendCode}
                                    >
                                        Resend verification code
                                    </Button>
                                </div>
                            ) : (
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
                                        <div className="flex gap-6">
                                            <FormField
                                                control={form.control}
                                                name="firstName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className='text-primary'>First Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter your first name" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />


                                            <FormField
                                                control={form.control}
                                                name="lastName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className='text-primary'>Last Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter your last name" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className='text-primary'>Email</FormLabel>
                                                    <FormControl>
                                                        <Input type="email" placeholder="Enter your email" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* CAPTCHA Widget */}
                                        <div id="clerk-captcha"></div>

                                        <LoadingButton isLoading={isLoading} icon={arrowRightIcon} loadingText="Signing up..." buttonText="Try for Free" className="w-full" />
                                    </form>
                                </Form>
                            )}
                        </FormProvider>

                        {!verifying && (
                            <div className='flex flex-col gap-2 text-[14px] font-light text-neutral-500 items-center mt-6'>
                                <Link href="/auth/login">Already have an account? Sign In</Link>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>)
}