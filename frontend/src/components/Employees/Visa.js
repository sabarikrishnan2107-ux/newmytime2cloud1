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
import {  Plane } from "lucide-react";
import { updateVisa } from "@/lib/api";
import DatePicker from "@/components/ui/DatePicker";
import { parseApiError } from "@/lib/utils";

const Visa = ({ employee_id, visa }) => {

    console.log("🚀 ~ Visa ~ employee_id, visa:", employee_id, visa)
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [globalError, setGlobalError] = useState(null);


    const form = useForm({
        defaultValues: {
            visa_no: visa?.visa_no || "",
            place_of_issues: visa?.place_of_issues || "",
            country: visa?.country || "",
            issue_date: visa?.issue_date || "",
            expiry_date: visa?.expiry_date || "",
            labour_no: visa?.labour_no || "",
            labour_issue_date: visa?.labour_issue_date || "",
            labour_expiry_date: visa?.labour_expiry_date || "",

        },
    });

    const { handleSubmit, formState } = form;
    const { isSubmitting } = formState;

    const handleCancel = () => router.push(`/employees`);

    const onSubmit = async (data) => {


        setGlobalError(null);
        try {
            const finalPayload = {
                visa_no: data?.visa_no || "",
                place_of_issues: data?.place_of_issues || "",
                country: data?.country || "",
                issue_date: data?.issue_date || "",
                expiry_date: data?.expiry_date || "",
                labour_no: data?.labour_no || "",
                labour_issue_date: data?.labour_issue_date || "",
                labour_expiry_date: data?.labour_expiry_date || "",

                employee_id: employee_id || "",

            };

            await updateVisa(finalPayload);

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
                            <Plane className="mr-3 h-6 w-6 text-primary" />
                            Visa Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <FormField
                                control={form.control}
                                name="visa_no"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Visa</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter Visa Number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="place_of_issues"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Place of Issue</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter Place of Issue" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="country"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Country</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter Country" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="issue_date"
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
                                name="expiry_date"
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
                                name="labour_no"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Labour No</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter Labour No" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />



                            <FormField
                                control={form.control}
                                name="labour_issue_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Labour Issue Date</FormLabel>
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
                                name="labour_expiry_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Labour Expiry Date</FormLabel>
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
                    title="Visa Saved"
                    description="Visa details have been saved successfully."
                />
            </div>

        </div>
    );
};

export default Visa;
