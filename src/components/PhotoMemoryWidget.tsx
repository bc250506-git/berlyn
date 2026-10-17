'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Sparkles, 
  Plus, 
  X, 
  Upload, 
  RefreshCw, 
  Trash2, 
  Calendar, 
  User, 
  Loader2,
  Check,
  Grid,
  Image as ImageIcon,
  Layers,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useCurrentUser } from './UserContext';
import confetti from 'canvas-confetti';

export interface PhotoMemory {
  id: string;
  photo_url: string;
  caption?: string | null;
  uploaded_by: string;
  created_at: string;
}

export function PhotoMemoryWidget() {
  const { currentUser } = useCurrentUser();
  const [memories, setMemories] = useState<PhotoMemory[]>([]);
  const [activePhoto, setActivePhoto] = useState<PhotoMemory | null>(null);

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoMemory | null>(null);

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [batchCaption, setBatchCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const abortControllerRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch memories from API (and Supabase)
  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memories', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const list: PhotoMemory[] = data.memories || [];
      setMemories(list);

      if (list.length === 0) {
        setActivePhoto(null);
        return;
      }

      // Pick a non-repeating random photo for the widget view
      selectRandomPhoto(list);
    } catch (err) {
      console.error('Failed to load memories:', err);
    }
  };

  const selectRandomPhoto = (list: PhotoMemory[]) => {
    if (list.length === 0) {
      setActivePhoto(null);
      return;
    }

    let seenIds: string[] = [];
    try {
      const saved = localStorage.getItem('berlyn_seen_photo_ids');
      if (saved) seenIds = JSON.parse(saved);
    } catch (e) {}

    let unvisited = list.filter((p) => !seenIds.includes(p.id));
    if (unvisited.length === 0) {
      seenIds = [];
      unvisited = list;
    }

    const pickedIndex = Math.floor(Math.random() * unvisited.length);
    const chosen = unvisited[pickedIndex];
    setActivePhoto(chosen);

    const updatedSeen = [...seenIds, chosen.id];
    localStorage.setItem('berlyn_seen_photo_ids', JSON.stringify(updatedSeen));
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  // Handle files selection (supports multiple 1 - 160+ photos at once)
  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setSelectedFiles(fileList);
    setUploadErrors([]);
  };

  // Batch Concurrent Queue Uploader (2 parallel concurrent uploads to prevent timeouts & CPU overload)
  const handleBatchUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || isUploading) return;

    setIsUploading(true);
    abortControllerRef.current = false;
    const total = selectedFiles.length;
    setUploadProgress({ current: 0, total, percentage: 0 });
    setUploadErrors([]);

    const newUploadedMemories: PhotoMemory[] = [];
    const errors: string[] = [];
    let completedCount = 0;

    // Worker queue with concurrency 2
    const concurrency = 2;
    let nextIndex = 0;

    const uploadWorker = async () => {
      while (nextIndex < total && !abortControllerRef.current) {
        const currentIndex = nextIndex++;
        const file = selectedFiles[currentIndex];

        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('caption', batchCaption.trim());
          formData.append('uploader', currentUser || 'berk');

          const res = await fetch('/api/memories/upload', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || `Upload failed for ${file.name}`);
          }

          const data = await res.json();
          if (data.memory) {
            newUploadedMemories.push(data.memory);
          }
        } catch (err: any) {
          console.warn(`File ${file.name} failed:`, err);
          errors.push(`${file.name}: ${err.message || 'Error'}`);
        } finally {
          completedCount++;
          const percent = Math.round((completedCount / total) * 100);
          setUploadProgress({ current: completedCount, total, percentage: percent });
        }
      }
    };

    // Run parallel workers
    const workers = Array.from({ length: Math.min(concurrency, total) }, () => uploadWorker());
    await Promise.all(workers);

    // Update global state with all new memories
    if (newUploadedMemories.length > 0) {
      setMemories((prev) => [...newUploadedMemories, ...prev]);
      setActivePhoto(newUploadedMemories[0]);

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    if (errors.length > 0) {
      setUploadErrors(errors);
    }

    setIsUploading(false);

    // If all succeeded, close modal after short delay
    if (errors.length === 0) {
      setTimeout(() => {
        setSelectedFiles([]);
        setBatchCaption('');
        setShowUploadModal(false);
      }, 700);
    }
  };

  // Next Random Memory
  const handleNextRandom = () => {
    if (memories.length <= 1) return;
    let seenIds: string[] = [];
    try {
      const saved = localStorage.getItem('berlyn_seen_photo_ids');
      if (saved) seenIds = JSON.parse(saved);
    } catch (e) {}

    let unvisited = memories.filter((p) => p.id !== activePhoto?.id && !seenIds.includes(p.id));
    if (unvisited.length === 0) {
      seenIds = activePhoto ? [activePhoto.id] : [];
      unvisited = memories.filter((p) => p.id !== activePhoto?.id);
    }

    const picked = unvisited[Math.floor(Math.random() * unvisited.length)];
    if (picked) {
      setActivePhoto(picked);
      localStorage.setItem('berlyn_seen_photo_ids', JSON.stringify([...seenIds, picked.id]));
    }
  };

  // Delete a memory
  const handleDeleteMemory = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this photo from your sanctuary?')) return;

    try {
      await fetch(`/api/memories?id=${id}`, { method: 'DELETE' });
      const updated = memories.filter((m) => m.id !== id);
      setMemories(updated);

      if (activePhoto?.id === id) {
        selectRandomPhoto(updated);
      }
      if (lightboxPhoto?.id === id) {
        setLightboxPhoto(null);
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  // Count HEIC files
  const heicCount = selectedFiles.filter((f) => 
    f.name.toLowerCase().endsWith('.heic') || f.name.toLowerCase().endsWith('.heif')
  ).length;

  return (
    <>
      {/* 1. HOMEPAGE PHOTO MEMORY WIDGET CARD */}
      <div className="card-cozy p-5 relative overflow-hidden bg-gradient-to-br from-[#131926] via-[#161d2d] to-[#121722] border border-rose-500/20 shadow-xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold tracking-wider text-rose-400 uppercase flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-rose-500" />
            <span>Our Memories & Moments</span>
            <span className="text-slate-400 font-mono text-[10px] font-normal">
              ({memories.length} {memories.length === 1 ? 'photo' : 'photos'})
            </span>
          </span>

          <div className="flex items-center gap-1.5">
            {memories.length > 0 && (
              <button
                onClick={() => setShowGalleryModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer"
                title="View all photos in gallery"
              >
                <Grid className="w-3 h-3" />
                <span>Gallery</span>
              </button>
            )}

            {memories.length > 1 && (
              <button
                onClick={handleNextRandom}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Shuffle another memory"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-xs font-semibold transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Photos</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activePhoto ? (
          <div className="space-y-3 animate-fade-in">
            {/* Memory Photo Container */}
            <div 
              onClick={() => setLightboxPhoto(activePhoto)}
              className="rounded-2xl overflow-hidden border border-white/[0.08] relative group bg-[#0e1420] aspect-[16/10] max-h-72 cursor-pointer"
            >
              <img
                src={activePhoto.photo_url}
                alt={activePhoto.caption || 'Our love memory'}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-90" />
              
              {/* Photo Bottom Caption Overlay */}
              <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between gap-3 text-white">
                <div className="truncate">
                  {activePhoto.caption && (
                    <p className="text-xs font-semibold leading-snug drop-shadow-md text-white truncate">
                      {activePhoto.caption}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-300/90 flex items-center gap-1.5 mt-0.5">
                    <span>Uploaded by {activePhoto.uploaded_by === 'berk' ? '🦁 Berk' : '🌸 Jaquilyn'}</span>
                    <span>•</span>
                    <span>{new Date(activePhoto.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-slate-300">
                    Tap to expand 🔍
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="p-8 rounded-2xl border border-dashed border-white/[0.1] text-center space-y-3 bg-[#111724]/50">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">No Photos Uploaded Yet</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-0.5 leading-relaxed">
                Add your favorite couple photos! Supports bulk batch upload (up to 160+ photos at once) with automatic iPhone HEIC to WebP conversion.
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Upload Photos</span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================================== */}
      {/* 2. BATCH / BULK UPLOAD MODAL */}
      {/* ============================================================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-3.5 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-rose-400" />
                <span>Bulk Photo Upload (Toplu Ekleme)</span>
              </h3>
              {!isUploading && (
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFiles([]);
                    setUploadErrors([]);
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleBatchUpload} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Errors notice */}
              {uploadErrors.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Some photos could not be uploaded ({uploadErrors.length}):</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto text-[10px] space-y-0.5">
                    {uploadErrors.map((err, i) => (
                      <div key={i} className="truncate">• {err}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Bar (Visible while uploading) */}
              {isUploading && (
                <div className="p-4 rounded-2xl bg-[#162030] border border-rose-500/30 space-y-2.5 animate-pulse">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-white flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                      <span>Uploading & Converting to WebP...</span>
                    </span>
                    <span className="text-rose-400 font-mono">
                      {uploadProgress.current} / {uploadProgress.total} ({uploadProgress.percentage}%)
                    </span>
                  </div>

                  <div className="w-full h-3 bg-white/[0.08] rounded-full overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-500 to-purple-500 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-slate-400 text-center">
                    Photos are processed in parallel batches with Sharp optimization. Please keep this tab open!
                  </p>
                </div>
              )}

              {/* File Drop & Multi-Select Box */}
              {!isUploading && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Select Photos (Multiple / Bulk Selection Enabled)
                  </label>
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    accept="image/*,.heic,.heif"
                    onChange={handleFilesChange}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 rounded-2xl border-2 border-dashed border-white/[0.14] hover:border-rose-500/50 text-center cursor-pointer transition-all bg-[#141b27] space-y-2 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto text-rose-400 group-hover:scale-110 transition-transform shadow-inner">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-white font-semibold text-sm block">
                        {selectedFiles.length > 0 
                          ? `✅ ${selectedFiles.length} photos selected` 
                          : 'Tap to select photos (or select all 160 at once!)'}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Supports iPhone HEIC, JPG, PNG & WebP. Automatically converted and compressed!
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Selection Summary */}
              {selectedFiles.length > 0 && !isUploading && (
                <div className="p-3.5 rounded-2xl bg-[#151e2c] border border-white/[0.08] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-white">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-purple-400" />
                      <span>Ready for Batch Upload</span>
                    </span>
                    <span className="text-rose-400 font-mono">{selectedFiles.length} Photos</span>
                  </div>

                  {heicCount > 0 && (
                    <p className="text-[10px] text-purple-300 flex items-center gap-1">
                      <span>📱</span>
                      <span>Includes {heicCount} iPhone HEIC images (will auto-convert to WebP).</span>
                    </p>
                  )}

                  <p className="text-[10px] text-slate-400">
                    Uploaded in high-speed parallel batches of 2. Each photo will be optimized to ~200KB.
                  </p>
                </div>
              )}

              {/* Optional Shared Caption */}
              {!isUploading && (
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">
                    Memory Note or Caption for this Batch (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Summer memories, date nights, trips..."
                    value={batchCaption}
                    onChange={(e) => setBatchCaption(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500 transition-colors"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    You can leave this blank, or provide a title for these memories.
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.06]">
                {!isUploading ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={selectedFiles.length === 0}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload All ({selectedFiles.length} Photos)</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      abortControllerRef.current = true;
                      setIsUploading(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/[0.1] hover:bg-rose-600 text-white font-medium transition-colors"
                  >
                    Stop Uploading
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 3. FULL GALLERY MODAL (GRID VIEW OF ALL PHOTOS) */}
      {/* ============================================================================== */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-5 animate-fade-in">
          <div className="w-full max-w-4xl bg-[#111724] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-white/[0.08] bg-[#111724] shrink-0">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Our Memory Gallery
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-semibold">
                  {memories.length} Photos
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowGalleryModal(false);
                    setShowUploadModal(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add More</span>
                </button>
                <button
                  onClick={() => setShowGalleryModal(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo Grid with Lazy Loading */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {memories.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  No memories yet. Upload your couple photos!
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {memories.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setLightboxPhoto(m)}
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-[#161f2f] border border-white/[0.08] hover:border-rose-500/40 cursor-pointer transition-all duration-300 shadow-md"
                    >
                      <img
                        src={m.photo_url}
                        alt={m.caption || 'Memory'}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Hover Info & Delete Button */}
                      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] truncate max-w-[80%] font-medium">
                          {m.caption || 'Memory'}
                        </span>
                        <button
                          onClick={(e) => handleDeleteMemory(m.id, e)}
                          className="p-1 rounded-lg bg-black/60 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 4. LIGHTBOX MODAL (FULLSCREEN HIGH-RES VIEW) */}
      {/* ============================================================================== */}
      {lightboxPhoto && (
        <div 
          onClick={() => setLightboxPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in cursor-zoom-out"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-3xl max-h-[92vh] flex flex-col items-center cursor-default"
          >
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={lightboxPhoto.photo_url}
              alt={lightboxPhoto.caption || 'Memory'}
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/[0.1]"
            />

            <div className="w-full mt-3 flex items-center justify-between text-white text-xs px-2">
              <div>
                <p className="font-semibold text-sm">{lightboxPhoto.caption || 'Our Love Memory'}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Uploaded by {lightboxPhoto.uploaded_by === 'berk' ? '🦁 Berk' : '🌸 Jaquilyn'} • {new Date(lightboxPhoto.created_at).toLocaleDateString()}
                </p>
              </div>

              <button
                onClick={() => handleDeleteMemory(lightboxPhoto.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
