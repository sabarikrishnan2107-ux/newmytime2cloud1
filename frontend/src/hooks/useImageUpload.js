import { useRef, useState } from "react";

export default function useImageUpload({ onChange, maxSizeMB = 2 }) {
  const fileInputRef = useRef(null);
  const [imageError, setError] = useState("");

  const handleUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit.`);
      return;
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Only JPG and PNG formats are supported.");
      return;
    }

    try {
      const base64String = await convertFileToBase64(file);
      setError("");
      if (onChange) onChange(base64String);
    } catch {
      setError("Error converting file to Base64.");
    }
  };

  const FileInput = () => (
    <input
      type="file"
      ref={fileInputRef}
      onChange={handleFileChange}
      accept=".jpg, .jpeg, .png"
      className="hidden"
    />
  );

  return {
    FileInput,
    handleUploadClick,
    imageError,
  };
}
