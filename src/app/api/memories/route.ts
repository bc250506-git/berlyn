import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const MEMORIES_FILE = path.join(process.cwd(), 'src', 'lib', 'memories.json');
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'memories');

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
    console.error('Failed to save memories:', err);
  }
}

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
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

    // Convert HEIC/PNG/JPG/etc to WebP with auto-rotation & smart resizing for massive bulk photo sets
    const webpBuffer = await sharp(inputBuffer)
      .rotate() // automatically rotate based on iPhone EXIF orientation tag
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true }) // optimize huge 48MP photos
      .webp({ quality: 84, effort: 4 })
      .toBuffer();

    const fileName = `memory-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.webp`;
    let photoUrl = `/uploads/memories/${fileName}`;

    // 1. Try uploading to Supabase Storage bucket 'memories'
    const supabase = getSupabaseServerClient();
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
        console.warn('Supabase storage upload failed, saving to local public folder fallback:', err);
      }
    }

    // 2. Local fallback save in case Supabase bucket is not yet created
    if (photoUrl.startsWith('/uploads/memories/')) {
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      fs.writeFileSync(path.join(UPLOAD_DIR, fileName), webpBuffer);
    }

    const newMemory = {
      id: `mem-${Date.now()}`,
      photo_url: photoUrl,
      caption: caption.trim() || null,
      uploaded_by: uploader,
      created_at: new Date().toISOString(),
    };

    // Save to Supabase table if available
    if (supabase) {
      try {
        await supabase.from('memories').insert([newMemory]);
      } catch (e) {
        // fallback
      }
    }

    // Save to local file
    const memories = getMemoriesFromFile();
    memories.unshift(newMemory);
    saveMemoriesToFile(memories);

    return NextResponse.json({ success: true, memory: newMemory }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to process and upload memory photo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    const memories = getMemoriesFromFile().filter((m: any) => m.id !== id);
    saveMemoriesToFile(memories);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
