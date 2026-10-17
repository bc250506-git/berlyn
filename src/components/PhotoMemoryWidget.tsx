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
  Check
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch memories and select non-repeating random photo
  const fetchAndSelectRandom = async () => {
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

      // Read seen photos history from localStorage
      let seenIds: string[] = [];
      try {
        const saved = localStorage.getItem('berlyn_seen_photo_ids');
        if (saved) seenIds = JSON.parse(saved);
      } catch (e) {}

      let unvisited = list.filter((p) => !seenIds.includes(p.id));

      // If all photos have been seen, reset history so they cycle again without immediate repeat
      if (unvisited.length === 0) {
        seenIds = [];
        unvisited = list;
      }

      // Pick random photo
      const pickedIndex = Math.floor(Math.random() * unvisited.length);
      const chosen = unvisited[pickedIndex];

      setActivePhoto(chosen);

      // Record as seen
      const updatedSeen = [...seenIds, chosen.id];
      localStorage.setItem('berlyn_seen_photo_ids', JSON.stringify(updatedSeen));
    } catch (err) {
      console.error('Failed to load memories:', err);
    }
  };

  useEffect(() => {
    fetchAndSelectRandom();
  }, []);

  // Handle file selection (with HEIC awareness)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadError(null);

    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    if (!isHeic) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  // Upload photo with server-side HEIC -> WebP conversion
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('caption', caption.trim());
      formData.append('uploader', currentUser || 'berk');

      const res = await fetch('/api/memories/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const data = await res.json();
      const newMemory: PhotoMemory = data.memory;

      setMemories((prev) => [newMemory, ...prev]);
      setActivePhoto(newMemory);

      // Reset modal state
      setSelectedFile(null);
      setFilePreview(null);
      setCaption('');
      setShowUploadModal(false);

      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Upload failed. Please check the file.');
    } finally {
      setIsUploading(false);
    }
  };

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

  const isHeicFile = selectedFile && (
    selectedFile.name.toLowerCase().endsWith('.heic') || 
    selectedFile.name.toLowerCase().endsWith('.heif')
  );

  return (
    <>
      {/* Photo Memory Widget: Matching Love Journey card size & aesthetic */}
      <div className="card-cozy p-5 relative overflow-hidden bg-gradient-to-br from-[#131926] via-[#161d2d] to-[#121722] border border-rose-500/20">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold tracking-wider text-rose-400 uppercase flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-rose-500" />
            <span>Our Memories & Moments</span>
            <span className="text-slate-500 font-mono text-[10px] font-normal">
              ({memories.length} {memories.length === 1 ? 'photo' : 'photos'})
            </span>
          </span>

          <div className="flex items-center gap-1.5">
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
              <span>Add Photo</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activePhoto ? (
          <div className="space-y-3 animate-fade-in">
            {/* Memory Photo Container */}
            <div className="rounded-2xl overflow-hidden border border-white/[0.08] relative group bg-[#0e1420] aspect-[16/10] max-h-72">
              <img
                src={activePhoto.photo_url}
                alt={activePhoto.caption || 'Our love memory'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
              
              {/* Photo Bottom Caption Overlay */}
              <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between gap-3 text-white">
                <div>
                  {activePhoto.caption && (
                    <p className="text-xs font-semibold leading-snug drop-shadow-md text-white">
                      {activePhoto.caption}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-300/90 flex items-center gap-1.5 mt-0.5">
                    <span>Uploaded by {activePhoto.uploaded_by === 'berk' ? '🦁 Berk' : '🌸 Jaquilyn'}</span>
                    <span>•</span>
                    <span>{new Date(activePhoto.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </p>
                </div>

                <span className="text-[9px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-slate-300 shrink-0">
                  Memory ✨
                </span>
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
                Add your favorite couple photos here. iPhone HEIC and standard formats are automatically converted to optimized WebP!
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Our First Photo</span>
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal (Sticky Header) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-5 pb-3.5 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-rose-400" />
                <span>Upload Couple Memory Photo</span>
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                  setFilePreview(null);
                  setUploadError(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {uploadError}
                </div>
              )}

              {/* File Drop / Select Area */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">
                  Select Photo (Supports iPhone HEIC, JPG, PNG, WebP)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,.heic,.heif"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-white/[0.12] hover:border-rose-500/40 text-center cursor-pointer transition-all bg-[#141b27] space-y-2 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center mx-auto text-rose-400 group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-white font-semibold text-xs block">
                      {selectedFile ? selectedFile.name : 'Tap to choose photo from device'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      iPhone HEIC photos are automatically converted to fast WebP format
                    </span>
                  </div>
                </div>
              </div>

              {/* HEIC Notice or Image Preview */}
              {isHeicFile && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs flex items-center gap-2">
                  <span className="text-base">📱</span>
                  <div>
                    <span className="font-semibold block">iPhone HEIC Detected</span>
                    <span className="text-[10px] text-purple-200">
                      Sharp engine will automatically convert this to crisp WebP on upload.
                    </span>
                  </div>
                </div>
              )}

              {filePreview && (
                <div className="rounded-xl overflow-hidden border border-white/[0.1] max-h-48 relative">
                  <img src={filePreview} alt="Preview" className="w-full h-48 object-cover" />
                </div>
              )}

              {/* Caption */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Caption or Memory Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Karpaz camping sunrise, or cozy coffee date..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Converting & Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Upload & Save Memory</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
