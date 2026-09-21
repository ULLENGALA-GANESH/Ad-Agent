import { useState, useRef } from "react";
import { uploadFile } from "../api/backend";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  PhotoIcon,
  XMarkIcon,
  PlayIcon
} from "@heroicons/react/24/outline";

export default function FileUpload({ label, subtext, onUploaded, value }) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState(""); // "video", "image", "tabular"
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const detectFileType = (name) => {
    const ext = name.split(".").pop().toLowerCase();
    if (["mp4", "avi", "mov", "mkv"].includes(ext)) return "video";
    if (["png", "jpg", "jpeg", "webp", "bmp"].includes(ext)) return "image";
    return "tabular";
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setFileName(file.name);
    const type = detectFileType(file.name);
    setFileType(type);

    if (type === "video" || type === "image") {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    try {
      const path = await uploadFile(file);
      onUploaded(path);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = (e) => {
    e.stopPropagation();
    setFileName("");
    setFileType("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onUploaded("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <label className="text-xs font-bold text-gray-200 uppercase tracking-wide block">
            {label}
          </label>
          {subtext && (
            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{subtext}</p>
          )}
        </div>
        {fileName && (
          <button
            type="button"
            onClick={clearFile}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors z-20 cursor-pointer shrink-0 mt-0.5"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      <motion.div
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.99 }}
        className={`relative backdrop-blur-xl border-2 border-dashed rounded-3xl p-6 cursor-pointer transition-all duration-500 group overflow-hidden ${
          isDragging
            ? "border-cyan-400 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 shadow-2xl shadow-cyan-500/30"
            : fileName
            ? fileType === "video"
              ? "border-rose-400/60 bg-gradient-to-br from-rose-500/10 to-red-500/10 shadow-xl shadow-rose-500/20"
              : fileType === "image"
              ? "border-purple-400/60 bg-gradient-to-br from-purple-500/10 to-pink-500/10 shadow-xl shadow-purple-500/20"
              : "border-green-400/50 bg-gradient-to-br from-green-500/10 to-emerald-500/10 shadow-xl shadow-green-500/20"
            : "border-white/10 bg-white/5 hover:border-cyan-400/60 hover:bg-gradient-to-br hover:from-cyan-500/10 hover:to-blue-500/10 hover:shadow-xl hover:shadow-cyan-500/20"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.mat,.pt,.npy,.png,.jpg,.jpeg,.webp,.mp4,.avi,.mov,.mkv"
          className="hidden"
          onChange={(e) => e.target.files.length && handleFile(e.target.files[0])}
        />

        <div className="flex flex-col items-center text-center relative z-10">
          <AnimatePresence mode="wait">
            {uploading ? (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center py-4"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mb-3"
                />
                <p className="text-cyan-300 text-sm font-medium">Uploading & Profiling Specimen...</p>
                <p className="text-gray-400 text-xs mt-1">Autonomous Multimodal Ingestion</p>
              </motion.div>
            ) : fileName ? (
              <motion.div
                key="uploaded"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center w-full"
              >
                {/* Visual Preview for Video */}
                {fileType === "video" && previewUrl && (
                  <div className="w-full max-w-sm rounded-xl overflow-hidden border border-rose-500/30 bg-black/40 mb-3 relative group/video">
                    <video
                      src={previewUrl}
                      controls
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-rose-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1">
                      <VideoCameraIcon className="w-3 h-3" />
                      CCTV FEED READY
                    </div>
                  </div>
                )}

                {/* Visual Preview for Image */}
                {fileType === "image" && previewUrl && (
                  <div className="w-full max-w-sm rounded-xl overflow-hidden border border-purple-500/30 bg-black/40 mb-3 relative">
                    <img
                      src={previewUrl}
                      alt="Specimen preview"
                      className="w-full h-36 object-contain bg-slate-950/60 p-2"
                    />
                    <div className="absolute top-2 left-2 bg-purple-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1">
                      <PhotoIcon className="w-3 h-3" />
                      OPTICAL SPECIMEN
                    </div>
                  </div>
                )}

                {/* Standard Tabular Badge */}
                {fileType === "tabular" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <CheckCircleIcon className="w-12 h-12 text-emerald-400 mb-2" />
                  </motion.div>
                )}

                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10 max-w-full">
                  {fileType === "video" ? (
                    <VideoCameraIcon className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : fileType === "image" ? (
                    <PhotoIcon className="w-4 h-4 text-purple-400 shrink-0" />
                  ) : (
                    <DocumentTextIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <p className="text-white font-medium text-xs truncate max-w-[240px]">{fileName}</p>
                </div>
                <p className="text-gray-400 text-[11px] mt-2">
                  {fileType === "video"
                    ? "Video surveillance telemetry buffered. Click Run to detect breaches."
                    : fileType === "image"
                    ? "Optical specimen mapped. Click Run for defect heatmap localization."
                    : "Telemetry dataset mapped. Click Run to isolate anomalies."}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center py-4"
              >
                <motion.div
                  animate={isDragging ? { y: [0, -8, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <ArrowUpTrayIcon className="w-10 h-10 text-gray-400 group-hover:text-cyan-400 transition-colors mb-2" />
                </motion.div>
                <p className="text-gray-200 font-semibold text-sm mb-1">
                  {isDragging ? "Drop specimen or telemetry file" : "Drag & drop or browse files"}
                </p>
                <p className="text-gray-400 text-xs">
                  Supports <span className="text-cyan-300">CSV, Parquet, NPY</span> • <span className="text-rose-300">MP4, AVI</span> (CCTV) • <span className="text-purple-300">PNG, JPG</span> (Defects)
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-3xl pointer-events-none"
          />
        )}
      </motion.div>
    </div>
  );
}
