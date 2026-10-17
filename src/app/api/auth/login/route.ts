import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth-constants';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, password } = body;

    const berkPass = (process.env.BERK_PASS || 'berk123').trim();
    const jaqPass = (process.env.JAQUILYN_PASS || 'jaquilyn123').trim();
    const enteredPass = (password || '').trim();

    let authenticatedUser: 'berk' | 'jaquilyn' | null = null;

    if (user === 'berk' && enteredPass === berkPass) {
      authenticatedUser = 'berk';
    } else if (user === 'jaquilyn' && enteredPass === jaqPass) {
      authenticatedUser = 'jaquilyn';
    } else if (!user && enteredPass) {
      // Direct password login without selecting name
      if (enteredPass === berkPass) {
        authenticatedUser = 'berk';
      } else if (enteredPass === jaqPass) {
        authenticatedUser = 'jaquilyn';
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: 'Invalid password. Please try again.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true, user: authenticatedUser });

    // Set HTTP-only secure cookie for 1 year
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: authenticatedUser,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Authentication failed. Please try again.' }, { status: 500 });
  }
}
