"use client";
import React, { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { compressImage, notify } from "@/lib/utils";

const ImageUploader = ({ onImageSet = () => {}, existingImage = null }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!existingImage) return;
    setPreview(existingImage);
  }, [existingImage]);

  // Simple photo upload: compress client-side for a sane file size, then hand
  // the image back to the parent. No face validation / detection.
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const compressed = await compressImage(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.8,
      });
      setPreview(compressed);
      onImageSet(compressed);
    } catch (error) {
      console.error("Image upload error:", error);
      await notify("Upload failed", "Could not process the image.", "error");
      setPreview(null);
      onImageSet(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm">
      <label className="relative group cursor-pointer block w-fit">
        <div
          className={`w-40 h-40 rounded-full bg-white border-4 shadow-xl overflow-hidden flex items-center justify-center transition-all duration-300 transform group-hover:scale-105
          ${loading ? "animate-pulse border-primary-500" : "border-slate-300 dark:border-white/20"}`}
        >
          {preview ? (
            <img
              src={preview}
              alt="Employee"
              className="object-cover w-full h-full rounded-full"
            />
          ) : (
            <div className="text-center">
              <Camera size={40} className="text-slate-400 mx-auto" />
              <p className="text-[10px] text-slate-500 mt-1 font-bold">
                UPLOAD PHOTO
              </p>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] text-white font-semibold">
                Uploading…
              </span>
            </div>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          disabled={loading}
        />
      </label>
    </div>
  );
};

export default ImageUploader;
