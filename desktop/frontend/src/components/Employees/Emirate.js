"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { SuccessDialog } from "@/components/SuccessDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

import { useRouter } from "next/navigation";
import { IdCard } from "lucide-react";
import { updateEmirate } from "@/lib/api";
import DatePicker from "@/components/ui/DatePicker";
import { parseApiError } from "@/lib/utils";

const Emirate = ({ employee_id, emirate }) => {

    console.log("🚀 ~ emirate ~ employee_id, emirate:", employee_id, emirate)
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [globalError, setGlobalError] = useState(null);

    const form = useForm({
        defaultValues: {
            emirate_id: emirate?.emirate_id || "",
            nationality: emirate?.nationality || "",
            issue: emirate?.issue || "",
            expiry: emirate?.expiry || "",
            date_of_birth: emirate?.date_of_birth || "",
        },
    });

    const { handleSubmit, formState } = form;
    const { isSubmitting } = formState;

    const handleCancel = () => router.push(`/employees`);

    const onSubmit = async (data) => {


        setGlobalError(null);
        try {
            const finalPayload = {
                emirate_id: data?.emirate_id || "",
                nationality: data?.nationality || "",
                issue: data?.issue || "",
                expiry: data?.expiry || "",
                date_of_birth: data?.date_of_birth || "",

                employee_id: employee_id || "",

            };

            await updateEmirate(finalPayload);

            setOpen(true);

            await new Promise(resolve => setTimeout(resolve, 2000));

            setOpen(false);

            router.push(`/employees`);
        } catch (error) {
            setGlobalError(parseApiError(error));
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 py-8">
            <div className="">
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                            <IdCard className="mr-3 h-6 w-6 text-primary" />
                            Emirate Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <FormField
                                control={form.control}
                                name="emirate_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Emirates Id</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter Emirates Id" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="nationality"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nationality</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter Nationality" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="issue"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Issue Date</FormLabel>
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date)}
                                            placeholder="Pick a date"
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="expiry"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Expiry Date</FormLabel>
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date)}
                                            placeholder="Pick a date"
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="date_of_birth"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Date of Birth</FormLabel>
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date)}
                                            placeholder="Pick a date"
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                        </div>

                        {globalError && (
                            <div
                                className="mb-4 p-3 border border-red-500 bg-red-50 text-red-700 rounded-lg"
                                role="alert"
                            >
                                {globalError}
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex justify-end space-x-4 pt-4">
                            <Button type="button" variant="secondary" onClick={handleCancel}>
                                CANCEL
                            </Button>
                            <Button
                                type="submit"
                                className="bg-primary hover:bg-indigo-700"
                                disabled={isSubmitting} a
                            >
                                {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
                            </Button>
                        </div>
                    </form>
                </Form>

                <SuccessDialog
                    open={open}
                    onOpenChange={setOpen}
                    title="Emirate Saved"
                    description="Emirate details have been saved successfully."
                />
            </div>

        </div>
    );
};

export default Emirate;
