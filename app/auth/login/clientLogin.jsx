'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSignIn } from "@clerk/nextjs";
import { z } from "zod";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import LoadingButton from "@/components/loading-button";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const formSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
});

const arrowRightIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18} color={"#fff"} fill={"none"}>
        <path d="M3 12L21 12M21 12L12.5 3.5M21 12L12.5 20.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [emailId, setEmailId] = useState("");
    const router = useRouter();
    const { isLoaded, signIn, setActive } = useSignIn();

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
        },
    });

    // Effect to handle autofill
    useEffect(() => {
        const emailInput = document.querySelector('input[name="email"]');
        if (emailInput) {
            const value = emailInput.value;
            if (value) {
                form.setValue('email', value);
            }
        }
    }, [form]);

    const resetState = () => {
        setVerifying(false);
        setEmail("");
        setCode("");
        setEmailId("");
        form.reset({ email: "" });
    };

    async function onSubmit(values) {
        if (!isLoaded || !signIn) {
            console.log("Clerk is not loaded or signIn is unavailable.");
            return;
        }

        setIsLoading(true);

        try {
            const { supportedFirstFactors } = await signIn.create({
                identifier: values.email,
            });

            const emailCodeFactor = supportedFirstFactors?.find(
                (factor) => factor.strategy === "email_code"
            );

            if (emailCodeFactor) {
                const { emailAddressId } = emailCodeFactor;
                setEmailId(emailAddressId);
                await signIn.prepareFirstFactor({
                    strategy: "email_code",
                    emailAddressId,
                });

                setVerifying(true);
                setEmail(values.email);
                toast.success("Verification code sent to your email.");
            } else {
                toast.error("Email code strategy is not supported.");
            }
        } catch (err) {
            if (err.errors && err.errors[0]?.code === "form_identifier_not_found") {
                toast.error("Account not found. Please try again.");
            } else {
                toast.error("Failed to start the sign-in process. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    }

    async function handleVerification(e) {
        e.preventDefault();

        if (!isLoaded || !signIn) {
            console.log("Clerk is not loaded or signIn is unavailable.");
            return;
        }

        setIsLoading(true);

        try {
            const signInAttempt = await signIn.attemptFirstFactor({
                strategy: "email_code",
                code,
            });

            if (signInAttempt.status === "complete") {
                toast.success("Successfully signed in!");
                await setActive({ session: signInAttempt.createdSessionId });

                resetState();
                router.push("/");
                router.refresh();
                window.location.reload();
            } else {
                toast.error("Verification failed. Please try again.");
            }
        } catch (err) {
            if (err.errors && err.errors[0]?.code === "form_code_incorrect") {
                toast.error("Incorrect verification code. Please try again.");
            } else {
                toast.error("Verification failed. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    }

    async function handleResendOTP() {
        if (!isLoaded || !signIn) {
            console.log("Clerk is not loaded or signIn is unavailable.");
            return;
        }

        try {
            await signIn.prepareFirstFactor({
                strategy: "email_code",
                emailAddressId: emailId,
            });
            toast.success("A new verification code has been sent to your email.");
        } catch (err) {
            toast.error("Failed to resend verification code. Please try again.");
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
                        className="bg-white p-6 sm:p-8 rounded-lg shadow-authCard max-w-md w-full mx-auto"
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-semibold mb-2">
                                {verifying ? "Verify Your Email" : "Welcome back to Millo"}
                            </h1>
                            <p className="text-gray-600 text-sm">
                                {verifying
                                    ? `We've sent a verification code to ${email}.`
                                    : "Please use your email address to sign in."}
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
                                        onClick={handleResendOTP}
                                    >
                                        Resend verification code
                                    </Button>
                                </div>
                            ) : (
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className='text-primary'>Email</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="email"
                                                            placeholder="Enter your email"
                                                            {...field}
                                                            onBlur={(e) => {
                                                                field.onBlur();
                                                                if (e.target.value !== field.value) {
                                                                    form.setValue('email', e.target.value);
                                                                }
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <LoadingButton isLoading={isLoading} icon={arrowRightIcon} loadingText="Sending code..." buttonText="Continue" className="w-full" />
                                    </form>
                                </Form>
                            )}
                        </FormProvider>

                        {!verifying && (
                            <div className='flex flex-col gap-2 text-[14px] font-light text-neutral-500 items-center mt-6'>
                                <Link href="/auth/signup">Create an account</Link>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    )
}