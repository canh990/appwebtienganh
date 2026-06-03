/**
 * geminiClient.js
 * Centralized Gemini AI client with automatic model fallback + retry logic.
 *
 * Model priority order (fastest/lightest first):
 *   1. gemini-2.5-flash-lite  (primary)
 *   2. gemini-3.1-flash-lite  (fallback 1)
 *   3. gemini-3.5-flash       (fallback 2)
 *
 * On 503 Service Unavailable or 429 Too Many Requests the client will:
 *   - Wait a short delay then retry the same model once.
 *   - If still failing, move to the next model in the list.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL_PRIORITY = [
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
];

const RETRY_DELAY_MS = 1500; // ms to wait before retrying same model

/** Sleep helper */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Generate content using Gemini with automatic fallback across models.
 *
 * @param {string} prompt  - The prompt to send.
 * @param {string} apiKey  - Gemini API key.
 * @returns {Promise<string>} - The generated text response.
 * @throws Will throw only after all models have been exhausted.
 */
async function generateWithFallback(prompt, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;

  for (const modelName of MODEL_PRIORITY) {
    // Try current model twice (1 retry) before moving on
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini] Trying model="${modelName}" attempt=${attempt}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        console.log(`[Gemini] Success with model="${modelName}"`);
        return result.response.text();
      } catch (err) {
        lastError = err;
        const status = err.status || 0;
        const isRetryable = status === 503 || status === 429 || err.message?.includes('503') || err.message?.includes('429');

        console.warn(`[Gemini] Model="${modelName}" attempt=${attempt} failed: ${err.message?.slice(0, 120)}`);

        if (!isRetryable) {
          // Non-retryable error (e.g. 404, 400) — skip to next model immediately
          break;
        }

        if (attempt === 1) {
          // Wait before retry
          console.log(`[Gemini] Retrying "${modelName}" after ${RETRY_DELAY_MS}ms...`);
          await sleep(RETRY_DELAY_MS);
        }
      }
    }
    // Try next model
    console.log(`[Gemini] Falling back to next model...`);
  }

  // All models exhausted
  throw lastError || new Error('All Gemini models failed to respond.');
}

module.exports = { generateWithFallback };
