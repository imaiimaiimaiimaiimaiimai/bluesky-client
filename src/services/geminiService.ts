import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Gemini API with your API key from environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
if (!API_KEY) {
  throw new Error('VITE_GEMINI_API_KEY not found in environment variables');
}

const genAI = new GoogleGenerativeAI(API_KEY); // No need to specify apiVersion: 'v1' explicitly, it's often the default

// --- FIX: Use the correct model name ---
const model = genAI.getGenerativeModel({
  // Use the latest stable Gemini 1.5 Flash model
  model: 'gemini-1.5-flash-latest',
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
  // generationConfig can also be set here if consistent across calls
  // generationConfig: {
  //   maxOutputTokens: 1000, // Example
  // }
});

// History to maintain context of the conversation
let chatHistory: Array<{ role: string, parts: Array<{text: string}> }> = [];

/**
 * Send a message to the Gemini API and get a response (Stateless)
 * NOTE: This function doesn't use the chat history.
 * Use chatWithGemini for conversational context.
 * @param message - The user's message
 * @returns The AI's response
 */
export async function sendMessageToGemini(message: string): Promise<string> {
  try {
    // Generate content directly from the model (no history)
    const result = await model.generateContent(message);
    const response = result.response;
    const text = response.text();

    // Note: This function doesn't add to the shared chatHistory
    // If you want it to, you'd need to add logic similar to chatWithGemini

    return text;
  } catch (error) {
    console.error('Error communicating with Gemini API (sendMessageToGemini):', error);
    // Provide more specific error feedback if possible
    if (error instanceof Error) {
        return `Sorry, I encountered an error: ${error.message}. Please try again later.`;
    }
    return 'Sorry, I encountered an unknown error while processing your request. Please try again later.';
  }
}

/**
 * Send a message to the Gemini API with chat history for context
 * @param message - The user's message
 * @returns The AI's response
 */
export async function chatWithGemini(message: string): Promise<string> {
  try {
    // Create a chat session *using the existing history*
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        // Consider making maxOutputTokens configurable or adjusting as needed
        maxOutputTokens: 1000,
      },
    });

    // Send message and get response
    const result = await chat.sendMessage(message);
    const response = result.response; // Access response directly
    const text = response.text();

    // --- FIX: Update chat history correctly ---
    // The SDK's chat.sendMessage automatically manages history internally *for that chat object*.
    // To maintain your *external* chatHistory array, you need to manually add BOTH the user message
    // AND the model response AFTER getting the response.
    chatHistory.push({ role: 'user', parts: [{ text: message }] });
    chatHistory.push({ role: 'model', parts: [{ text }] });

    // Optional: Update the chat object's history if you plan to reuse 'chat' variable,
    // though usually you'd start a new chat with the updated external history next time.
    // chat.history = chatHistory; // Usually not needed if you restart chat each time

    return text;
  } catch (error) {
    console.error('Error communicating with Gemini API (chatWithGemini):', error);
     // Provide more specific error feedback if possible
    if (error instanceof Error) {
        return `Sorry, I encountered an error: ${error.message}. Please try again later.`;
    }
    return 'Sorry, I encountered an unknown error while processing your request. Please try again later.';
  }
}

/**
 * Clear the chat history
 */
export function clearChatHistory(): void {
  console.log("Clearing chat history.");
  chatHistory = [];
}

// Example of how to load API key from environment variables in Node.js
// At the top of your file or in your setup:
// require('dotenv').config(); // if using dotenv package
// const apiKey = process.env.GEMINI_API_KEY;
// if (!apiKey) {
//   throw new Error("Missing GEMINI_API_KEY environment variable");
// }
// const genAI = new GoogleGenerativeAI(apiKey);