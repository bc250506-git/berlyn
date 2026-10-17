import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME } from '@/lib/auth-constants';

export async function GET() {
  const cookieStore = await cookies();
  const user = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (user === 'berk' || user === 'jaquilyn') {
    return NextResponse.json({ authenticated: true, user });
  }

  return NextResponse.json({ authenticated: false, user: null });
}

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}
