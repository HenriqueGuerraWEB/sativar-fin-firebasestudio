
import { NextRequest, NextResponse } from 'next/server';
import { createAdmin, adminExists } from '@/ai/flows/users-flow';
import { createSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const exists = await adminExists();
    if (exists) {
      return NextResponse.json({ error: 'Um administrador já existe.' }, { status: 403 });
    }

    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Nome, email e senha são obrigatórios.' }, { status: 400 });
    }

    const newUser = await createAdmin({ email, password, name });

    // Create session for the new admin and set cookie
    await createSession(newUser);

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error('Signup API error:', error);
    return NextResponse.json({ error: error.message || 'Falha ao criar a conta.' }, { status: 500 });
  }
}
