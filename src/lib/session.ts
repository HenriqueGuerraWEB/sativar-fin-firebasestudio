
import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { type User } from './types/user-types';

const secretKey = process.env.SESSION_SECRET || 'your-super-secret-key-that-is-long-enough';
const key = new TextEncoder().encode(secretKey);

// Define the session payload structure
interface SessionPayload {
  user: User;
  expires: Date;
}

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // Session expires in 1 day
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    // This can happen if the token is invalid or expired
    console.log('Failed to verify session token:', error);
    return null;
  }
}

export async function createSession(user: Omit<User, 'password'>) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
  const session = await encrypt({ user, expires });

  // Save the session in a secure, httpOnly cookie
  cookies().set('session', session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;

  const session = await decrypt(sessionCookie);
  if (!session) return null;
  
  // You might want to refresh the user data from the DB here in a real app
  return session as SessionPayload;
}

export function deleteSession() {
  cookies().delete('session');
}
