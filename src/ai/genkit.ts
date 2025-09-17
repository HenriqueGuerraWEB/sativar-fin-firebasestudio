
/**
 * @fileoverview This file initializes and configures the Genkit AI framework.
 * It creates a global `ai` object that is used throughout the application
 * to define AI flows, tools, and prompts.
 */

import { genkit, getAuth } from 'genkit';

// Initialize Genkit without any plugins by default.
// Plugins, like googleAI(), can be added here when needed for generative models.
export const ai = genkit();
export { getAuth };
