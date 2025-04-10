<template>
  <div class="imai-chat-container" :class="{ 'dark-theme': isDarkTheme }">
    <header class="chat-header">
      <div class="header-left">
        <h1>ImaiAI Chat</h1>
      </div>
      <div class="header-right">
        <button class="theme-toggle" @click="isDarkTheme = !isDarkTheme" title="Toggle theme">
          <span v-if="isDarkTheme">☀️</span>
          <span v-else>🌙</span>
        </button>
        <button class="clear-chat" @click="clearChat" title="Clear Chat">
          <SVGIcon name="refresh" />
        </button>
      </div>
    </header>

    <main class="chat-content">
      <div class="messages-container" ref="messagesContainer">
        <div class="welcome-container" v-if="messages.length === 0">
          <div class="logo-container">
            <SVGIcon name="imai-logo" class="imai-logo" />
            <h2>Hi, I'm ImaiAI</h2>
            <p class="welcome-message">How can I help you today?</p>
          </div>
          <div class="quick-prompts">
            <div class="prompt-category">
              <h3>Get Started</h3>
              <div class="prompt-buttons">
                <button class="prompt-button" @click="usePrompt('Tell me about yourself')" title="Ask me about myself">
                  <span>Tell me about yourself</span>
                </button>
                <button class="prompt-button" @click="usePrompt('What can you help me with?')" title="Ask me what I can help you with">
                  <span>What can you help me with?</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-for="(message, index) in messages" :key="message.id || index" class="message-item" :class="message.sender">
          <div class="message-container">
            <div class="message-avatar" v-if="message.sender === 'ai'">
              <SVGIcon name="imai-logo" />
            </div>
            <div class="message-content">
              <div class="message-text" v-html="formatMessage(message.text)"></div>
            </div>
            <div class="message-avatar user-avatar" v-if="message.sender === 'user'">
              <span>{{ userInitial }}</span>
            </div>
          </div>
          <div class="message-actions" v-if="message.sender === 'ai'">
             <button class="action-button" title="Like">
              <SVGIcon name="thumb-up" />
            </button>
            <button class="action-button" title="Dislike">
              <SVGIcon name="thumb-down" />
            </button>
            <button class="action-button" title="Copy to clipboard" @click="copyToClipboard(message.text)">
              <SVGIcon name="copy" />
            </button>
          </div>
        </div>

        <div v-if="isTyping" class="message-item ai">
          <div class="message-container">
            <div class="message-avatar">
              <SVGIcon name="imai-logo" />
            </div>
            <div class="message-content typing">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div class="chat-input-area">
      <div class="input-container">
        <textarea
          ref="inputField"
          v-model="inputText"
          class="chat-input"
          placeholder="Ask anything"
          @keydown.enter="handleEnterKey" @input="autoResize"
          rows="1" ></textarea>

        <div class="input-actions">
          <button class="tool-button" title="Voice chat" @click="startVoiceChat">
            <SVGIcon name="stream" />
          </button>

          <div class="spacer"></div>

          <button
            class="send-button"
            :class="{ active: inputText.trim().length > 0 }" @click="sendMessage"
            title="Send message"
            :disabled="isTyping" >
            <SVGIcon name="arrow-up" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import SVGIcon from '@/components/images/SVGIcon.vue'; // Assuming this path is correct
import { chatWithGemini, clearChatHistory } from '@/services/geminiService'; // Use this if streaming not yet implemented in service

// Define interfaces for the Web Speech API
// (Included as requested, even if available globally in modern browsers)
interface CustomWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
  SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance;
  speechSynthesis: SpeechSynthesis;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  // Add other properties/methods if needed based on usage
}

// Use the standard SpeechRecognitionEvent type if available, otherwise define basic structure
interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

// Use the standard SpeechRecognitionErrorEvent type if available, otherwise define basic structure
interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string; // Common property, adjust if needed
    readonly message: string; // Common property
}

// State Variables
const isDarkTheme = ref(true); // Or load from localStorage/prefs
const inputText = ref('');
const messages = ref<{ id: number, sender: 'user' | 'ai', text: string }[]>([]); // Use ID for key prop
let messageIdCounter = ref(0); // Simple ID counter
const isTyping = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);
const inputField = ref<HTMLTextAreaElement | null>(null);
let recognition: SpeechRecognition | null = null; // Speech recognition instance
let wasLastInputVoice = ref(false); // Track if voice was used for input

// Computed Properties
const userInitial = computed(() => {
  // Replace with actual user data if available
  return 'U';
});

// --- Core Methods ---

/**
 * Handles Enter key press in textarea for sending messages.
 * Allows Shift+Enter for newlines.
 */
function handleEnterKey(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault(); // Prevent default newline insertion
    if (inputText.value.trim().length > 0) {
       sendMessage();
    }
  }
  // Allow Shift+Enter to insert a newline naturally
}

/**
 * Sends the current input text to the AI service.
 */
async function sendMessage() {
  const currentInput = inputText.value.trim();

  // Prevent sending empty messages
  if (currentInput === '') return;
  // Prevent sending while AI is typing
  if (isTyping.value) return;

  // Add user message to the chat display
  addMessage('user', currentInput);

  // Clear input field
  inputText.value = '';

  // Reset textarea height
  autoResize();

  // Scroll to bottom and show typing indicator
  scrollToBottom();
  isTyping.value = true;

  try {
    const response = await chatWithGemini(currentInput); // Send only text for now

    // Add AI response to the chat display
    addMessage('ai', response);

    // --- Voice Output Trigger ---
    // If the last input was voice, speak the response
    if (wasLastInputVoice.value) {
      speakText(response);
      wasLastInputVoice.value = false; // Reset flag after processing
    }

  } catch (error) {
    console.error('Error getting response from Gemini:', error);
    addMessage('ai', 'Sorry, I encountered an error processing your request. Please try again later.');
  } finally {
    // Hide typing indicator and ensure scroll is at bottom
    isTyping.value = false;
    scrollToBottom();
     // Re-focus input field for convenience
    inputField.value?.focus();
  }
}

/**
 * Adds a message to the messages array with a unique ID.
 */
function addMessage(sender: 'user' | 'ai', text: string) {
    messageIdCounter.value++;
    messages.value.push({
        id: messageIdCounter.value,
        sender: sender,
        text: text
    });
    scrollToBottom(); // Ensure scroll happens after message is added
}

/**
 * Clears the chat messages and resets the history in the service.
 */
function clearChat() {
  messages.value = [];
  clearChatHistory(); // From geminiService
  messageIdCounter.value = 0; // Reset message ID
  inputText.value = ''; // Clear input field
  wasLastInputVoice.value = false; // Reset voice flag
  if ('speechSynthesis' in window && (window as CustomWindow).speechSynthesis.speaking) {
    (window as CustomWindow).speechSynthesis.cancel(); // Stop any ongoing speech
  }
  inputField.value?.focus(); // Focus input field
}

/**
 * Uses a predefined prompt and sends it.
 */
function usePrompt(prompt: string) {
  inputText.value = prompt;
  sendMessage();
}

// --- Voice Input (SpeechRecognition) and Output (TTS) Methods ---

/**
 * Starts or stops the voice recognition process.
 */
function startVoiceChat() {
  const SpeechRecognitionAPI = (window as CustomWindow).SpeechRecognition || (window as CustomWindow).webkitSpeechRecognition;
  const speechSynthesisAPI = (window as CustomWindow).speechSynthesis;

  if (!SpeechRecognitionAPI) {
    addMessage('ai', 'Sorry, voice recognition is not supported in your browser. Please try Chrome, Edge, or Safari.');
    return;
  }
   if (!speechSynthesisAPI) {
    addMessage('ai', 'Sorry, voice output (TTS) is not supported in your browser.');
    // Continue with voice input if recognition is supported
  }

  // Stop ongoing listening or speaking
  if (recognition && recognition.state === 'started') {
    recognition.stop(); // This will trigger 'onend'
  }
   if (speechSynthesisAPI && speechSynthesisAPI.speaking) {
     speechSynthesisAPI.cancel(); // Stop any current speech
  }


  // --- Initialize Recognition ---
  if (!recognition) {
      recognition = new SpeechRecognitionAPI();
      recognition.continuous = false; // Process speech after pauses
      recognition.interimResults = true; // Show interim results while speaking
      recognition.lang = 'en-US'; // Set language - make configurable?

      recognition.onresult = handleRecognitionResult;
      recognition.onend = handleRecognitionEnd;
      recognition.onerror = handleRecognitionError;
  }

  // --- Start Listening ---
  let finalTranscript = ''; // Reset transcript
  recognition.start();
  wasLastInputVoice.value = true; // Flag that input method is voice

  // Optionally add a visual cue like 'Listening...' directly in the input or messages
   addMessage('user', 'Listening...'); // Add temporary message
   scrollToBottom();
}

/**
 * Handles results from the SpeechRecognition API.
 */
function handleRecognitionResult(event: SpeechRecognitionEvent) {
    let interimTranscript = '';
    let finalTranscript = ''; // Recalculate final transcript based on current results

    for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
            finalTranscript += transcriptPart;
        } else {
            interimTranscript += transcriptPart;
        }
    }

     // Update the temporary "Listening..." message with interim/final results
    const listeningMsgIndex = messages.value.findIndex(m => m.text === 'Listening...' || m.sender === 'user' && m.text.startsWith(finalTranscript.substring(0,10)) ); // Find the listening message more robustly
    if (listeningMsgIndex !== -1) {
        messages.value[listeningMsgIndex].text = finalTranscript || interimTranscript || 'Listening...';
         scrollToBottom(); // Scroll as text updates
    }
}

/**
 * Handles the end of a SpeechRecognition session.
 */
function handleRecognitionEnd() {
    // Find and potentially update/remove the "Listening..." message
     const listeningMsgIndex = messages.value.findIndex(m => m.text.includes('Listening...') || (finalTranscript && m.text.startsWith(finalTranscript.substring(0,10))));

    if (finalTranscript) {
      // Update the message with the final transcript if it was temporary
       if (listeningMsgIndex !== -1) {
           messages.value[listeningMsgIndex].text = finalTranscript;
       } else {
            // If message wasn't found/updated, add it (should ideally not happen)
            addMessage('user', finalTranscript);
       }

      // Send the transcript to the AI
      inputText.value = finalTranscript; // Set input text before sending
      sendMessage(); // Let sendMessage handle the rest (including wasLastInputVoice flag)

    } else {
      // No final transcript captured
      if (listeningMsgIndex !== -1) {
        // Remove the temporary message if nothing useful was said
        messages.value.splice(listeningMsgIndex, 1);
      }
      // Optionally inform the user
      addMessage('ai', "I didn't quite catch that. Could you please speak again?");
      wasLastInputVoice.value = false; // Reset flag as voice input failed
       inputField.value?.focus();
    }
    finalTranscript = ''; // Clear transcript for next time
}

/**
 * Handles errors from the SpeechRecognition API.
 */
function handleRecognitionError(event: SpeechRecognitionErrorEvent) {
    wasLastInputVoice.value = false; // Reset flag on error
    finalTranscript = ''; // Clear any partial transcript
    console.error('Speech recognition error:', event.error, event.message);

    // Remove any temporary "Listening..." message
    const listeningMsgIndex = messages.value.findIndex(m => m.text.includes('Listening...'));
    if (listeningMsgIndex !== -1) {
        messages.value.splice(listeningMsgIndex, 1);
    }

    // Inform the user about the error
    let errorMessage = `Speech recognition error: ${event.error}.`;
    if (event.error === 'no-speech') {
        errorMessage = "I didn't detect any speech. Please try again.";
    } else if (event.error === 'audio-capture') {
        errorMessage = "Audio capture failed. Please check microphone permissions and hardware.";
    } else if (event.error === 'not-allowed') {
        errorMessage = "Microphone access denied. Please grant permission in your browser settings.";
    }
    addMessage('ai', errorMessage);
     inputField.value?.focus();
}

/**
 * Speaks the provided text using the browser's Text-to-Speech API.
 */
function speakText(textToSpeak: string) {
  const speechSynthesisAPI = (window as CustomWindow).speechSynthesis;
  if (speechSynthesisAPI) {
    // Stop any currently speaking utterance before starting a new one
    if (speechSynthesisAPI.speaking) {
      speechSynthesisAPI.cancel();
    }

    // Basic cleaning: Remove potential HTML tags for cleaner speech
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = textToSpeak;
    let cleanedText = tempDiv.textContent || tempDiv.innerText || "";
    // Remove placeholder markers if they exist
    cleanedText = cleanedText.replace(/\[Attached:.*?\]/g, '').trim();

    if (cleanedText === '') {
        console.warn("TTS: Attempted to speak empty or cleaned text.");
        return; // Don't speak if nothing remains
    }

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = 'en-US'; // Make configurable?
    utterance.rate = 1.0;   // Speed (0.1 to 10)
    utterance.pitch = 1.0;  // Pitch (0 to 2)

    // Optional: Select a specific voice (can be browser/OS dependent)
    // const voices = speechSynthesisAPI.getVoices();
    // utterance.voice = voices.find(voice => voice.lang === 'en-US' && voice.name.includes('Google')) || voices.find(voice => voice.lang === 'en-US'); // Example voice selection

    utterance.onerror = (event) => {
        console.error('SpeechSynthesis Error:', event);
        addMessage('ai', `(Sorry, couldn't speak the response. Error: ${event.error})`);
    };

    speechSynthesisAPI.speak(utterance);
  } else {
    console.warn("Browser doesn't support SpeechSynthesis API.");
    // Optionally add a message if TTS isn't supported but was expected
    // addMessage('ai', "(Speech output not supported in this browser)");
  }
}

// --- UI Helper Methods ---

/**
 * Formats message text (basic markdown, code, file info).
 */
function formatMessage(text: string): string {
  // Process markdown-like syntax first
  let formattedText = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>')         // Italic
    .replace(/`([^`]+)`/g, '<code>$1</code>');      // Inline code

  // Style the attached file information differently
   formattedText = formattedText.replace(/(\[Attached:.*?\])/g, '<span class="file-info">$1</span>');

   // Handle multi-line code blocks (```language\n code \n```) - Basic version
   formattedText = formattedText.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
     const languageClass = lang ? `language-${lang}` : '';
     // Basic escaping of HTML within code blocks
     const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
     return `<pre><code class="${languageClass}">${escapedCode.trim()}</code></pre>`;
   });

   // Convert remaining newlines to <br> tags
   formattedText = formattedText.replace(/\n/g, '<br>');

  return formattedText;
}

/**
 * Scrolls the messages container to the bottom smoothly.
 */
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
          top: messagesContainer.value.scrollHeight,
          behavior: 'smooth'
      });
    }
  });
}

/**
 * Automatically resizes the textarea based on its content.
 */
function autoResize() {
  if (inputField.value) {
    const el = inputField.value;
    // Temporarily reset height to calculate scroll height accurately
    el.style.height = 'auto';
    // Set height based on scroll height, respecting max height
    const maxHeight = 200; // Max height in pixels
    const scrollHeight = el.scrollHeight;
    el.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    // If max height is reached, enable vertical scroll
    el.style.overflowY = scrollHeight > maxHeight ? 'scroll' : 'hidden';
  }
}

/**
 * Copies text to the clipboard.
 */
async function copyToClipboard(text: string) {
    try {
        // Basic cleaning: Remove potential HTML tags before copying
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const cleanedText = tempDiv.textContent || tempDiv.innerText || "";

        await navigator.clipboard.writeText(cleanedText);
        // Optional: Show a temporary success message to the user
        console.log('Text copied to clipboard');
        // Example: add temporary feedback - requires more state management
        // showToast('Copied!');
    } catch (err) {
        console.error('Failed to copy text: ', err);
        // Optional: Show an error message
        // showToast('Failed to copy');
    }
}

// --- Lifecycle Hook ---
onMounted(() => {
  // Focus the input field when the component mounts
  inputField.value?.focus();

  // Initial resize calculation
  autoResize();

  // Pre-load speech synthesis voices (recommended by MDN for some browsers)
  if ('speechSynthesis' in window) {
    (window as CustomWindow).speechSynthesis.getVoices();
  }
});

</script>

<style lang="scss" scoped>
// --- Base Styles ---
.imai-chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh; // Full viewport height
  overflow: hidden; // Prevent body scroll
  background-color: rgb(var(--bg-color)); // Use global theme variable
  color: rgb(var(--fg-color)); // Use global theme variable

  &.dark-theme {
    // Already dark, maybe subtle variations if needed
    background-color: rgb(var(--bg-color)); // Use global theme variable
    color: rgb(var(--fg-color)); // Use global theme variable
    // Re-apply specific dark theme overrides if needed elsewhere
    .input-container { background-color: rgb(var(--bg-color), 0.8); border-color: rgba(var(--fg-color), 0.1);}
    .message-item.ai .message-content { background-color: rgba(var(--fg-color), 0.1); color: rgb(var(--fg-color)); }
    .message-avatar.user-avatar { background-color: rgba(var(--fg-color), 0.1); }
    // ... other dark specific styles
  }
  // Add light theme rules if needed
  // &.light-theme { ... }
}

// --- Header Styles ---
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px; // Slightly adjust padding
  border-bottom: 1px solid rgba(255, 255, 255, 0.1); // Separator line
  flex-shrink: 0; // Prevent header from shrinking

  h1 {
    font-size: 1.2rem; // Responsive font size
    margin: 0;
    font-weight: 500;
  }

  .header-left, .header-right {
    display: flex;
    align-items: center;
    gap: 10px; // Space between buttons
  }

  .header-right {
    justify-content: flex-end;
  }

  // Generic button style for header actions
  .theme-toggle, .clear-chat {
    background: none;
    border: none;
    color: #b0b0b0; // Icon color
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    display: flex; // Center icon
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease, color 0.2s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }

    span { // For theme toggle emoji
        font-size: 1.2rem;
    }
    svg { // For SVG icons like refresh
        width: 18px;
        height: 18px;
    }
  }
}

// --- Main Content Area ---
.chat-content {
  flex: 1; // Take remaining vertical space
  overflow: hidden; // Hide overflow from main area
  position: relative;
  display: flex; // Use flex for message container
  flex-direction: column; // Stack messages vertically
}

.messages-container {
  flex: 1; // Allow messages to grow
  overflow-y: auto; // Enable vertical scroll ONLY for messages
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px; // Space between message items

  // Custom scrollbar styling (Webkit)
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1); // Subtle track
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2); // Scrollbar handle
    border-radius: 4px;
    border: 2px solid transparent; // Padding around thumb
    background-clip: padding-box;
  }
  &::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }
}

// --- Welcome Screen Styles ---
.welcome-container {
  // Center content vertically and horizontally within messages container when empty
  margin: auto; // Auto margins for centering in flex container
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px;

  .logo-container {
    margin-bottom: 30px;
    .imai-logo {
      width: 50px;
      height: 50px;
      margin-bottom: 15px;
      // Assuming SVG has fill="currentColor", otherwise set fill here
      color: #5b5fc7; // Use theme variable if available
    }
    h2 {
      font-size: 2rem;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 5px;
    }
    .welcome-message {
      font-size: 1.1rem;
      color: #a0a0a0;
    }
  }

  .quick-prompts {
    width: 100%;
    max-width: 500px; // Limit width of prompts section
    .prompt-category {
      margin-bottom: 20px;
      h3 {
        font-size: 1rem;
        font-weight: 500;
        margin-bottom: 10px;
        color: #c0c0c0;
      }
      .prompt-buttons {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
        .prompt-button {
          background-color: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #d0d0d0;
          cursor: pointer;
          padding: 10px 15px;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: background-color 0.2s ease;
          &:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }
        }
      }
    }
  }
}

// --- Message Item Styles ---
.message-item {
  display: flex;
  flex-direction: column;
  max-width: 85%; // Limit message width
  align-self: flex-start; // Default align left (AI)

  &.user {
    align-self: flex-end; // Align user messages right
    .message-container {
      flex-direction: row-reverse; // Avatar on the right
    }
    .message-content {
      background-color: #2563eb; // User message background
      color: white;
      border-radius: 15px 15px 5px 15px; // Bubble shape
    }
     .message-avatar { margin-left: 10px; } // Space between bubble and user avatar
  }

  &.ai {
     .message-container {
        flex-direction: row; // Avatar on the left
     }
     .message-content {
       background-color: #2a2a2a; // AI message background
       color: #ffffff;
       border-radius: 15px 15px 15px 5px; // Bubble shape
     }
      .message-avatar { margin-right: 10px; } // Space between avatar and AI bubble
  }
}

.message-container {
  display: flex;
  align-items: flex-end; // Align avatar to bottom of text bubble
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #5b5fc7; // Default AI avatar bg
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0; // Prevent avatar shrinking

  &.user-avatar {
    background-color: #444; // User avatar bg
    span {
      color: white;
      font-weight: 600;
      font-size: 0.9rem;
    }
  }

  svg { // Style for SVG logo in avatar
    width: 22px;
    height: 22px;
    fill: white;
  }
}

.message-content {
  padding: 12px 18px;
  font-size: 1rem; // Base font size
  line-height: 1.6;
  word-wrap: break-word; // Wrap long words
  overflow-wrap: break-word; // Ensure wrapping
  // Ensure images/media within messages are responsive
  :deep(img), :deep(video) {
    max-width: 100%;
    height: auto;
    border-radius: 8px; // Rounded corners for media
    margin-top: 8px;
  }
}

.message-text {
  white-space: pre-wrap; // Preserve whitespace and newlines

  // Styling for inline code `...`
  code:not(pre *) { // Target only inline code
    background-color: rgba(0, 0, 0, 0.3);
    padding: 3px 6px;
    border-radius: 4px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.9em;
    color: #f0f0f0;
  }

   // Styling for code blocks ```...```
  pre {
    background-color: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 12px 16px;
    margin: 10px 0;
    overflow-x: auto; // Allow horizontal scroll for long lines
    max-width: 100%;

    code {
      background-color: transparent !important; // Override inline style
      padding: 0 !important;
      border-radius: 0 !important;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.9em;
      color: #f0f0f0; // Code text color
      white-space: pre; // Keep code formatting
    }
  }

  // Styling for the attached file info
  .file-info {
    display: block; // Put on its own line
    font-size: 0.85em;
    color: #a0a0a0; // Dim color
    margin-top: 8px;
    font-style: italic;
  }
}

.message-actions {
  display: flex;
  margin-top: 8px;
  // Align actions based on sender
  padding-left: 46px; // (Avatar width + margin) for AI messages
  .message-item.user & {
      padding-left: 0;
      padding-right: 46px; // (Avatar width + margin) for User messages
      justify-content: flex-end; // Align actions right for user messages (optional)
  }

  .action-button {
    background: none;
    border: none;
    color: #888; // Dim action icon color
    cursor: pointer;
    padding: 5px;
    margin-right: 10px; // Space between action buttons
    border-radius: 4px;
    transition: color 0.2s ease, background-color 0.2s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
      color: #ccc;
    }

    svg {
      width: 16px;
      height: 16px;
      display: block; // Prevents extra space below icon
    }
  }
}

// --- Typing Indicator ---
.typing-indicator {
  display: flex;
  align-items: center;
  padding: 10px 0; // Add padding for spacing

  span {
    height: 8px;
    width: 8px;
    background-color: rgba(255, 255, 255, 0.5); // Dot color
    border-radius: 50%;
    display: inline-block;
    margin: 0 3px; // Space between dots
    animation: typing 1.4s infinite ease-in-out both;

    &:nth-child(1) { animation-delay: 0.0s; }
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}

@keyframes typing { // Keep existing animation
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.6; }
  40% { transform: scale(1.0); opacity: 1.0; }
}

// --- Input Area Styles ---
.chat-input-area {
  padding: 15px 20px 20px; // Padding around input area
  width: 100%;
  max-width: 800px; // Limit input area width
  margin: 0 auto; // Center input area horizontally
  flex-shrink: 0; // Prevent input area from shrinking
}

.input-container {
  background-color: #1e1e1e; // Input background
  border-radius: 12px; // Rounded corners
  overflow: hidden; // Clip contents
  display: flex;
  flex-direction: column;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1); // Subtle border
  transition: border-color 0.2s ease;

  &:focus-within { // Highlight when textarea has focus
    border-color: rgba(37, 99, 235, 0.5); // Use theme color if available
  }
}

.chat-input {
  width: 100%;
  background: none;
  border: none;
  color: #e0e0e0; // Input text color
  font-size: 1rem;
  resize: none; // Disable manual resize
  min-height: 56px; // Minimum height (approx 1 row + padding)
  max-height: 200px; // Maximum height before scrolling
  padding: 16px 20px; // Text padding inside textarea
  line-height: 1.5;
  outline: none; // Remove default focus outline
  overflow-y: hidden; // Hide scrollbar initially

  &::placeholder {
    color: #777; // Placeholder text color
  }
}

.input-actions {
  display: flex;
  align-items: center;
  padding: 8px 12px; // Padding for action buttons row
  border-top: 1px solid rgba(255, 255, 255, 0.1); // Separator line
  gap: 8px; // Space between action items

  .tool-button { // Style for Voice button
    background: none;
    border: none;
    color: #aaa; // Default icon color
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px; // Button height
    width: 36px;  // Button width
    border-radius: 8px;
    transition: background-color 0.2s ease, color 0.2s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.08);
      color: #fff;
    }

    svg { // Icon size within the button
       width: 20px;
       height: 20px;
     }

    // Specific styling for active voice listening button
    &.active-listening {
      color: #ff4081; // Active color (pinkish red)
      background-color: rgba(255, 64, 129, 0.1);
      animation: pulse 1.5s infinite;
    }
  }

  .spacer {
    flex: 1; // Pushes send button to the far right
  }

  .send-button {
    background: none; // Default transparent background
    border: none;
    color: #555; // Default inactive send icon color
    cursor: not-allowed; // Indicate disabled state
    padding: 6px;
    border-radius: 50%; // Circular button
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px; // Match tool buttons size
    height: 36px; // Match tool buttons size
    transition: background-color 0.2s ease, color 0.2s ease;

    svg {
      width: 20px; // Send icon size
      height: 20px;
    }

    // Styles when active (text entered)
    &.active {
      color: white; // Active icon color
      background-color: #2563eb; // Active background color
      cursor: pointer;

      &:hover {
        background-color: #1d4ed8; // Darker blue on hover when active
      }
       &:disabled { // Style when active but processing (typing)
          cursor: not-allowed;
          background-color: #555; // Grey out when disabled
          color: #aaa;
       }
    }
     // Ensure disabled state overrides hover when needed
     &:disabled {
          cursor: not-allowed;
          background-color: #555 !important; // Force grey background
          color: #aaa !important; // Force grey icon
     }
  }
}

// Pulse animation for active listening button
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 64, 129, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(255, 64, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 64, 129, 0); }
}
</style>