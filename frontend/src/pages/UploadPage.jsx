// frontend/src/pages/UploadPage.jsx
import React, { useRef, useState } from "react";
import api from "../api"; // your axios instance (baseURL http://localhost:5000/api)
import toast from "react-hot-toast";
import { ClipLoader } from "react-spinners";



const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export default function UploadPage() {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100
  const [result, setResult] = useState(null);

  // reset state
  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setUploading(false);
    setProgress(0);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const humanFileSize = (size) => {
    if (!size) return "";
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(1) + " " + ["B", "KB", "MB", "GB"][i];
  };

  const validateFile = (f) => {
    if (!f) return "No file provided";
    if (!ALLOWED_TYPES.includes(f.type)) return "Only JPG, PNG or WEBP images are allowed";
    if (f.size > MAX_FILE_BYTES) return `File too large (max ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(1)} MB)`;
    return null;
  };

  // file pick handler
  const handleFilePick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const err = validateFile(f);
    if (err) {
      toast.error(err);
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResult(null);
  };

  // drag & drop
  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    const err = validateFile(f);
    if (err) {
      toast.error(err);
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResult(null);
  };
  const handleDragOver = (e) => e.preventDefault();

  // upload local file selected by user (multipart/form-data)
  const uploadSelectedFile = async () => {
    if (!file) {
      toast.error("Please select an image first.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setResult(null);
    const toastId = toast.loading("Uploading...");

    try {
      const fd = new FormData();
      fd.append("image", file, file.name); // field name 'image' matches multer

      const resp = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
          }
        },
        timeout: 120000,
      });

      toast.dismiss(toastId);
      setUploading(false);
      setProgress(100);

      if (resp?.data?.success) {
        toast.success("Upload & classification successful");
        setResult(resp.data.record || resp.data);
      } else {
        toast.error("Upload succeeded but server response was unexpected");
        setResult(resp.data || null);
      }
    } catch (err) {
      toast.dismiss();
      setUploading(false);
      setProgress(0);
      console.error("Upload error", err);
      const msg = err?.response?.data?.message || err?.message || "Upload failed";
      toast.error(msg);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Upload & Classify</h1>
          <p className="text-sm text-gray-500">Upload an image — the model will classify it into Plastic / Paper / General.</p>
        </div>

        <div className="flex gap-2">
          <button onClick={reset} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">Reset</button>
        </div>
      </div>

      {/* Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-200 rounded-lg p-6 bg-white"
        style={{ minHeight: 220 }}
      >
        <div className="md:flex md:items-center md:justify-between gap-6">
          <div className="md:w-1/2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFilePick}
              className="hidden"
            />

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button onClick={() => fileInputRef.current && fileInputRef.current.click()} className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">Choose image</button>

                <button onClick={uploadSelectedFile} disabled={uploading} className={`px-3 py-2 rounded text-white ${uploading ? "bg-gray-400" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                  {uploading ? <span className="flex items-center gap-2"><ClipLoader size={12} /> Uploading...</span> : "Upload & Classify"}
                </button>

                <button onClick={reset} className="px-3 py-2 rounded border text-sm text-gray-700 hover:bg-gray-50">Clear</button>
              </div>

              <div className="text-xs text-gray-500">
                Supported: JPG / PNG / WEBP. Max file size: {(MAX_FILE_BYTES / 1024 / 1024).toFixed(1)} MB.
              </div>

              {file && <div className="mt-2 text-sm text-gray-700">Selected: <span className="font-medium">{file.name}</span> ({humanFileSize(file.size)})</div>}
            </div>
          </div>

          {/* Preview */}
          <div className="md:w-1/2 flex items-center justify-center">
            <div className="w-64 h-44 rounded-md bg-gray-50 border overflow-hidden flex items-center justify-center">
              {previewUrl ? (
                <img src={previewUrl} alt="preview" className="object-contain w-full h-full" />
              ) : (
                <div className="text-sm text-gray-400 px-4 text-center">Drop an image here or choose one to preview</div>
              )}
            </div>
          </div>
        </div>

        {/* progress bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-100 rounded h-2 overflow-hidden">
            <div className="h-2 bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 text-xs text-gray-500">{progress}%</div>
        </div>
      </div>

      {/* result card */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Result</div>
            {!result && <div className="text-sm text-gray-400">No result yet.</div>}
          </div>
        </div>

        {result && (
          <div className="mt-4 flex gap-4 items-center">
            <div className="w-28 h-20 bg-gray-100 rounded overflow-hidden border">
              <img src={result.imageUrl || previewUrl} alt="result" className="object-contain w-full h-full" />
            </div>

            <div className="flex-1">
              <div className="flex gap-6 items-center">
                <div>
                  <div className="text-xs text-gray-500">Category</div>
                  <div className="text-lg font-semibold">{result.category ?? "unknown"}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Confidence</div>
                  <div className="text-lg font-semibold">{(result.confidence ?? 0).toFixed(2)}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Device</div>
                  <div className="text-sm">{result.deviceId ?? "demo-web"}</div>
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-400">Filename: {result.filename}</div>
              <div className="mt-1 text-xs text-gray-400">Location: {result.location}</div>
            </div>

            <div>
              <a href={result.imageUrl || previewUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">Open image</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}