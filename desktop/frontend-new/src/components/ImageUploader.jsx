"use client";
import React, { useEffect, useState } from "react";
import { Camera, AlertCircle, CheckCircle2 } from "lucide-react";
import { compressImage, notify } from "@/lib/utils";
import axios from "axios";
import { FACE_VALIDATOR_URL } from "@/config";
import { replaceBackgroundWithWhite, prewarmBackgroundRemoval } from "@/lib/backgroundRemoval";
import { cropFaceWithPadding, prewarmFaceDetector } from "@/lib/faceCrop";

const ImageUploader = ({ onImageSet = () => {}, existingImage = null }) => {
  const [qualityScore, setQualityScore] = useState(0);
  const [preview, setPreview] = useState(null);
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(""); // "validating" | "removing-bg"

  useEffect(() => {
    if (!existingImage) return;
    setPreview(existingImage);
    setQualityScore(100);
    // Existing photos were already face-cropped + cleaned at upload time.
    // Re-running the bg-removal AI here would load a ~10MB model and block
    // the main thread for several seconds, freezing the edit page. So we
    // simply show the saved photo as-is.
  }, [existingImage]);

  // Pre-warm the bg-removal and face-detector modules so the first upload is fast.
  useEffect(() => {
    const id = setTimeout(() => {
      prewarmBackgroundRemoval().catch(() => {});
      prewarmFaceDetector();
    }, 800);
    return () => clearTimeout(id);
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setStage("validating");
    setReasons([]);

    try {
      const clientCompressed = await compressImage(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.8,
      });

      let url = `${FACE_VALIDATOR_URL}/validate-passport`;
      const { data } = await axios.post(url, {
        image_base64: clientCompressed,
      });

      const { status, message } = data;

      if (status) {
        setQualityScore(100);
        // 1) AI face detection picks the face bbox from the original photo and
        //    crops with passport-style padding (face ~50% of frame, hair on
        //    top, shoulders on bottom).
        // 2) Lenient bg removal then replaces only the clear backdrop with
        //    white, preserving every hair/edge pixel.
        let cropped;
        try {
          cropped = await cropFaceWithPadding(clientCompressed);
        } catch (cropErr) {
          console.warn("Face-detect crop failed, using full image:", cropErr);
          cropped = clientCompressed;
        }
        setPreview(cropped);
        setStage("removing-bg");
        try {
          const cleaned = await replaceBackgroundWithWhite(cropped);
          setPreview(cleaned);
          onImageSet(cleaned);
          await notify("Success", "Photo enhanced and background removed!", "success");
        } catch (bgErr) {
          console.warn("Background removal failed, using cropped image:", bgErr);
          onImageSet(cropped);
          await notify("Success", "Photo enhanced!", "success");
        }
      } else {
        setQualityScore(0);
        setReasons([message || "Face validation failed"]);
        setPreview(null);
        onImageSet(null);
        await notify("Quality Check", message || "No face detected", "error");
      }
    } catch (error) {
      console.error("Validation API error:", error);
      await notify("Service Offline", "Server error occurred.", "error");
    } finally {
      setLoading(false);
      setStage("");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm">
      <label className="relative group cursor-pointer block w-fit">
        <div
          className={`w-40 h-40 rounded-full bg-white border-4 border-border shadow-xl overflow-hidden flex items-center justify-center transition-all duration-300 transform group-hover:scale-105
          ${loading ? "animate-pulse border-primary-500" : "border-slate-300 dark:border-white/20"}
          ${qualityScore >= 70 ? "border-emerald-500" : ""}`}
        >
          {preview ? (
            <img
              src={preview}
              alt="Enhanced Passport"
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
                {stage === "removing-bg" ? "Removing background…" : "Validating…"}
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

      {/* Status Indicators */}
      <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            AI Validation
          </span>
          <div className="flex items-center gap-1">
            {qualityScore >= 70 ? (
              <CheckCircle2 size={14} className="text-emerald-500" />
            ) : qualityScore > 0 ? (
              <AlertCircle size={14} className="text-red-500" />
            ) : null}
            <span
              className={`text-xs font-bold ${qualityScore >= 70 ? "text-emerald-600" : "text-red-500"}`}
            >
              {qualityScore}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${qualityScore >= 70 ? "bg-emerald-500" : "bg-red-500"}`}
            style={{ width: `${qualityScore}%` }}
          />
        </div>

        {/* Dynamic Reasons Display */}
        {reasons.length > 0 && (
          <div className="mt-3 space-y-1">
            {reasons.map((err, i) => (
              <p
                key={i}
                className="text-[10px] text-red-500 flex items-center gap-1"
              >
                • {err}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
