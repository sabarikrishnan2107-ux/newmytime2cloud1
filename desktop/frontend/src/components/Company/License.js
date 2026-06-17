// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SuccessDialog } from "@/components/SuccessDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { User, ArrowLeft, Upload, Image, Briefcase, Badge, BaggageClaim, Building, Building2, Building2Icon, Info, Settings, File } from "lucide-react";
import { updateContact, updateLicense } from "@/lib/api";
import DropDown from "../ui/DropDown";
import DatePicker from "../ui/DatePicker";
import { parseApiError } from "@/lib/utils";

const CompanyLicense = ({ license, isLoading }) => {

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading company info...</p>;
  }

  // Simple local form state
  const [formData, setFormData] = useState({
    license_type: license?.license_type || "---",
    license_no: license?.license_no || "---",
    emirate: license?.emirate || "---",
    manager: license?.manager || "---",
    issue_date: license?.issue_date,
    expiry_date: license?.expiry_date,
    makeem_no: license?.makeem_no || "---"
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


  const onSubmit = async (e) => {
    e.preventDefault();

    setGlobalError(null);

    setIsSubmitting(true);

    try {

      await updateLicense(formData);

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
              <File className="mr-3 h-6 w-6 text-primary" />
              License Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  License Type
                </label>
                <DropDown
                  placeholder={'License Type'}
                  value={formData.license_type}
                  onChange={(value) =>
                    handleChange({ target: { name: "license_type", value } })
                  }
                  items={[
                    {
                      id: '',
                      name: 'Select Type',
                    },
                    {
                      id: 'commercial_licenses',
                      name: 'Commercial licenses',
                    },
                    {
                      id: 'industrial_license',
                      name: 'Industrial License',
                    },
                    {
                      id: 'professional_license',
                      name: 'Professional license',
                    },
                  ]}
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  License
                </label>
                <Input className="bg-white"
                  name="license_no"
                  value={formData.license_no}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  Emirate
                </label>
                <Input className="bg-white"
                  name="emirate"
                  value={formData.emirate}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  Manager
                </label>
                <Input className="bg-white"
                  name="manager"
                  value={formData.manager}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  Issue Date
                </label>
                <DatePicker
                  value={formData.issue_date}
                  onChange={(value) =>
                    handleChange({ target: { name: "issue_date", value } })
                  }
                  placeholder="Pick a date"
                />

              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  Expiry Date
                </label>
                <DatePicker
                  value={formData.expiry_date}
                  onChange={(value) =>
                    handleChange({ target: { name: "expiry_date", value } })
                  }
                  placeholder="Pick a date"
                />

              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  Makeem No
                </label>
                <Input className="bg-white"
                  name="makeem_no"
                  value={formData.makeem_no}
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
          title="License Info Uploaded"
          description="License Info saved successfully."
        />
      </div>
    </div>
  );
};

export default CompanyLicense;
