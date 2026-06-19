// @ts-nocheck
"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Upload, Image, ArrowLeft, Save } from "lucide-react";

import useImageUpload from "@/hooks/useImageUpload";
import { SuccessDialog } from "../SuccessDialog";
import { updateLogoOnly, getLogoOnly } from "@/lib/api";
import { parseApiError } from "@/lib/utils";


const ChangeLogo = () => {

    const [imagePreview, setImagePreview] = useState(null);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [open, setOpen] = useState(false);
    const [isNewImage, setIsNewImage] = useState(false);

    const { FileInput, handleUploadClick, imageError } = useImageUpload({
        onChange: (base64) => {
            setImagePreview(base64);
            setIsNewImage(true);
        },
    });

    useEffect(() => {
        const fetchLogo = async () => {
            try {
                const logo = await getLogoOnly();
                setImagePreview(logo);
            } catch (error) {
                setError(parseApiError(error));
            }
        };

        fetchLogo();
    }, []);

    const saveUploadedImage = async () => {

        setIsSubmitting(true);
        setError(null);

        try {
            let payload = {
                logo_base_64: imagePreview
            }

            let result = await updateLogoOnly(payload)

            console.log("Saving uploaded image:", result);

            // Simulate an API call
            setTimeout(() => {
                setOpen(true);
                setIsSubmitting(false)
                setIsNewImage(false);
            }, 2000);

        } catch (error) {
            setError(parseApiError(error));
            setIsSubmitting(false)
        }
    };

    return (
        <div className="w-full lg:w-72 lg:border-r lg:border-slate-200/60 lg:pr-8 flex flex-col items-center">
            <div className="w-40 h-40 rounded-full bg-indigo-50 dark:bg-indigo-900 flex items-center justify-center mb-4 border-4 border-dashed border-indigo-200 dark:border-indigo-700 overflow-hidden">
                {imagePreview ? (
                    <img
                        src={imagePreview}
                        alt="Company Logo"
                        onError={(e) => {
                            // if logo fails to load, clear preview so fallback icon shows
                            e.target.onerror = null;
                            setImagePreview(null);
                        }}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <Image className="h-16 w-16 text-primary" />
                )}
            </div>

            <p className="text-xs text-center text-muted-foreground">
                JPG or PNG, max 2MB.


            </p>

            <Button
                onClick={handleUploadClick}
                type="button"
                className="w-full bg-primary text-white hover:bg-indigo-700 my-2"
            >
                <Upload className="mr-2 h-4 w-4" />
                {imagePreview ? "Change Logo" : "Upload Logo"}
            </Button>

            <FileInput />

            {isNewImage &&
                <Button
                    onClick={saveUploadedImage}
                    type="button"
                    className="w-full bg-blue-500 text-white hover:bg-blue-700 mb-2"
                >
                    <Save className="h-4 w-4" />
                    {isSubmitting ? "Saving..." : "Save Logo"}
                </Button>
            }

            {imageError && (
                <p className="mt-2 text-xs text-red-500 text-center">
                    {imageError}
                </p>
            )}

            {error && (
                <p className="mt-2 text-xs text-red-500 text-center">
                    {error}
                </p>
            )}

            <SuccessDialog
                open={open}
                onOpenChange={setOpen}
                title="Logo Updated"
                description="Your company logo has been updated successfully."
            />
        </div>
    );
};

export default ChangeLogo;
