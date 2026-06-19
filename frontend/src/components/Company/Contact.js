// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SuccessDialog } from "@/components/SuccessDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { User, ArrowLeft, Upload, Image, Briefcase, Badge, BaggageClaim, Building, Building2, Building2Icon, Info, Settings, Contact } from "lucide-react";
import { updateContact } from "@/lib/api";
import { parseApiError } from "@/lib/utils";

const CompanyContact = ({ contact, isLoading }) => {

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading company info...</p>;
  }

  // Simple local form state
  const [formData, setFormData] = useState({
    name: contact?.name || "---",
    position: contact?.position || "---",
    number: contact?.number || "---",
    whatsapp: contact?.whatsapp || "---",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [open, setOpen] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };

  const validate = () => {

    const newErrors = {};

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    setGlobalError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {

      await updateContact(formData);

      setOpen(true);

      // Just to briefly show the success dialog
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setOpen(false);
    } catch (error) {
      setGlobalError(parseApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="lg:col-span-2 lg:pl-4">
        <form onSubmit={onSubmit} className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
              <Contact className="mr-3 h-6 w-6 text-primary" />
              Contact Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  Name
                </label>
                <Input className="bg-white"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  Position
                </label>
                <Input className="bg-white"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  Whatsapp
                </label>
                <Input className="bg-white"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  Phone
                </label>
                <Input className="bg-white"
                  name="number"
                  value={formData.number}
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>

          {globalError && (
            <div
              className="mb-4 p-3 border border-red-500 bg-red-50 text-red-700 rounded-lg"
              role="alert"
            >
              {globalError}
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="submit"
              className="bg-primary hover:bg-indigo-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
            </Button>
          </div>
        </form>

        <SuccessDialog
          open={open}
          onOpenChange={setOpen}
          title="Contact Uploaded"
          description="Contact updated successfully."
        />
      </div>
    </div>
  );
};

export default CompanyContact;
