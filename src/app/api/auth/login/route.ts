import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth-constants';

export async function POST(request: Request) {
  try {
    const { user, password } = await request.json();

    if (user !== 'berk' && user !== 'jaquilyn') {
      return NextResponse.json({ error: 'Invalid user profile' }, { status: 400 });
    }

    const expectedPass =
      user === 'berk'
        ? process.env.BERK_PASS || 'berk123'
        : process.env.JAQUILYN_PASS || 'jaquilyn123';

    // Allow password check or frictionless login if no password supplied or matches
    if (password && password.trim() !== expectedPass.trim()) {
      return NextResponse.json({ error: 'Incorrect passphrase or PIN' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user });

    // Set HTTP-only secure cookie for 1 year
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: user,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Failed to process login' }, { status: 500 });
  }
}
