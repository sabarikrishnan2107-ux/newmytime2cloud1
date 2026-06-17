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
import { LocationEdit } from "lucide-react";
import { updateAddress } from "@/lib/api";
import { parseApiError } from "@/lib/utils";

const EmergencyContact = ({ id, home_address,home_tel,home_mobile,home_fax,home_city,home_state,home_country }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  const form = useForm({
    defaultValues: {
      home_address: home_address || "",
      home_tel: home_tel || "",
      home_mobile: home_mobile || "",
      home_fax: home_fax || "",
      home_city: home_city || "",
      home_state: home_state || "",
      home_country: home_country || "",
    },
  });

  const { handleSubmit, formState } = form;
  const { isSubmitting } = formState;

  const handleCancel = () => router.push(`/employees`);

  const onSubmit = async (data) => {
    setGlobalError(null);
    try {
      const finalPayload = {
        home_address: data.home_address,
        home_tel: data.home_tel,
        home_mobile: data.home_mobile,
        home_fax: data.home_fax,
        home_city: data.home_city,
        home_state: data.home_state,
        home_country: data.home_country,
      };

      await updateAddress(finalPayload, id);

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
              <LocationEdit className="mr-3 h-6 w-6 text-primary" />
              Address
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Address */}


              <FormField
                control={form.control}
                name="home_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tel */}
              <FormField
                control={form.control}
                name="home_tel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tel</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter telephone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mobile */}
              <FormField
                control={form.control}
                name="home_mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter mobile number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fax */}
              <FormField
                control={form.control}
                name="home_fax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fax</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter fax number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* City */}
              <FormField
                control={form.control}
                name="home_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter city" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* State */}
              <FormField
                control={form.control}
                name="home_state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter state" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Nationality */}
              <FormField
                control={form.control}
                name="home_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationality</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter nationality" {...field} />
                    </FormControl>
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
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-indigo-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
              </Button>
            </div>
          </form>
        </Form>

        <SuccessDialog
          open={open}
          onOpenChange={setOpen}
          title="Address Saved"
          description="Your address details have been saved successfully."
        />
      </div>
    </div>
  );
};

export default EmergencyContact;
