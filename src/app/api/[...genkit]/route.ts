
import { genkit } from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { NextRequest, NextResponse } from 'next/server';
import { run } from '@genkit-ai/next';
import { getSession } from '@/lib/session';

genkit({
  plugins: [
    googleAI({
        apiVersion: "v1beta"
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

// This is the middleware function that will be executed for each Genkit request.
const genkitMiddleware = async (req: NextRequest) => {
    try {
        const session = await getSession();
        // If there's a session, we pass the user object to the run function.
        // Genkit will make this available in the flow's auth context.
        return run(req, { user: session?.user });
    } catch (error) {
         console.error("Genkit middleware error:", error);
        // If there's an error (e.g., JWT verification fails), we can deny access.
        return new NextResponse('Authentication Error', { status: 401 });
    }
};


export { genkitMiddleware as POST };
