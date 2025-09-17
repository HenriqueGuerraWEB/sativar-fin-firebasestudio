
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (session) {
      return NextResponse.json({ user: session.user });
    }
    return NextResponse.json({ user: null }, { status: 401 });
  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json({ user: null, error: 'Internal Server Error' }, { status: 500 });
  }
}
