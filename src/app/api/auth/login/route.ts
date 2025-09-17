
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/ai/flows/users-flow';
import { createSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 });
    }

    const user = await getUser({ email, password });

    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    // Create session and set cookie
    await createSession(user);

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Falha ao tentar fazer login.' }, { status: 500 });
  }
}
