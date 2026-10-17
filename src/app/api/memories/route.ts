import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { convertImageToWebP } from '@/lib/image-converter';
import { createClient } from '@supabase/supabase-js';

const MEMORIES_FILE = path.join(process.cwd(), 'src', 'lib', 'memories.json');
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'memories');

const DEFAULT_SUPABASE_URL = 'https://chwvmpmitbyugyiqtrvd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod3ZtcG1pdGJ5dWd5aXF0cnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDg3NjksImV4cCI6MjEwNzc4NDc2OX0.TPD1w8q-koj61A1iI_AT30mKWgUjjokX6wTLPhCIBvA';

function getMemoriesFromFile(): any[] {
  try {
    if (!fs.existsSync(MEMORIES_FILE)) return [];
    const data = fs.readFileSync(MEMORIES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveMemoriesToFile(memories: any[]) {
  try {
    const dir = path.dirname(MEMORIES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2), 'utf8');
  } catch (err) {
    // Ignore in serverless read-only environments
  }
}

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  try {
    return createClient(url, key);
  } catch (err) {
    console.error('Failed to create Supabase server client:', err);
    return null;
  }
}

// GET: fetch all memory photos
export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return NextResponse.json({ memories: data });
      }
    }

    const localMemories = getMemoriesFromFile();
    return NextResponse.json({ memories: localMemories });
  } catch (error: any) {
    return NextResponse.json({ memories: getMemoriesFromFile(), error: error.message });
  }
}

// POST: upload photo with HEIC -> WebP conversion
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caption = (formData.get('caption') as string) || '';
    const uploader = (formData.get('uploader') as string) || 'berk';

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const inputBuffer = Buffer.from(bytes);

    // Convert HEIC/PNG/JPG/etc to WebP with auto-rotation & smart resizing (1600px max)
    const webpBuffer = await convertImageToWebP(inputBuffer, file.name || '', 1600);

    const fileName = `memory-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.webp`;
    let photoUrl = '';

    const supabase = getSupabaseServerClient();

    // 1. Try uploading to Supabase Storage bucket 'memories'
    if (supabase) {
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('memories')
          .upload(fileName, webpBuffer, {
            contentType: 'image/webp',
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('memories')
            .getPublicUrl(fileName);
          if (publicUrlData?.publicUrl) {
            photoUrl = publicUrlData.publicUrl;
          }
        }
      } catch (err) {
        // Storage upload failed or bucket doesn't exist, will use data URL
      }
    }

    // 2. If storage upload did not yield a URL, use ultra-lightweight WebP Data URL
    // This is 100% serverless-safe on Vercel and guarantees zero ENOENT read-only errors!
    if (!photoUrl) {
      photoUrl = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
    }

    // 3. Local disk backup (ONLY on non-serverless local environments, safe with try-catch)
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    if (!isServerless && !photoUrl.startsWith('data:')) {
      try {
        if (!fs.existsSync(UPLOAD_DIR)) {
          fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }
        fs.writeFileSync(path.join(UPLOAD_DIR, fileName), webpBuffer);
      } catch (fsErr) {
        // Skip local write if read-only
      }
    }

    const newMemory = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      photo_url: photoUrl,
      caption: caption.trim() || null,
      uploaded_by: uploader,
      created_at: new Date().toISOString(),
    };

    // Save to Supabase database table
    if (supabase) {
      try {
        await supabase.from('memories').insert([newMemory]);
      } catch (e) {
        console.warn('Supabase DB insert error in memories:', e);
      }
    }

    // Save to local file backup
    try {
      const memories = getMemoriesFromFile();
      memories.unshift(newMemory);
      saveMemoriesToFile(memories);
    } catch (e) {}

    return NextResponse.json({ success: true, memory: newMemory }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to process and upload memory photo:', error);
    return NextResponse.json({ error: error.message || 'Upload processing failed' }, { status: 500 });
  }
}

// DELETE: remove photo
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.from('memories').delete().eq('id', id);
      } catch (e) {}
    }

    try {
      const memories = getMemoriesFromFile().filter((m: any) => m.id !== id);
      saveMemoriesToFile(memories);
    } catch (e) {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
