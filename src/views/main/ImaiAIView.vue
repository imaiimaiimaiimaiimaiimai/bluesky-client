<script setup lang="ts">
import { inject, ref, onMounted, reactive } from "vue"
import SVGIcon from "@/components/images/SVGIcon.vue"

const $t = inject("$t") as Function
const mainState = inject("state") as MainState

const messages = ref<Array<{
  id: number,
  role: 'user' | 'assistant',
  content: string,
  timestamp: Date
}>>([])

const newMessage = ref('')
const isLoading = ref(false)
const messageId = ref(0)

function sendMessage() {
  if (newMessage.value.trim() === '') return
  
  // Add user message
  messages.value.push({
    id: messageId.value++,
    role: 'user',
    content: newMessage.value,
    timestamp: new Date()
  })
  
  const userQuery = newMessage.value
  newMessage.value = ''
  
  // Simulate AI response
  isLoading.value = true
  setTimeout(() => {
    messages.value.push({
      id: messageId.value++,
      role: 'assistant',
      content: generateResponse(userQuery),
      timestamp: new Date()
    })
    isLoading.value = false
  }, 1000)
}

function generateResponse(query: string): string {
  // Simple response generation - in a real app, this would call an AI API
  const responses = [
    `I understand you're asking about "${query}". How can I help you further with this?`,
    `That's an interesting question about "${query}". Let me provide some insights...`,
    `Regarding "${query}", I think the key point to consider is the context and specific use case.`,
    `"${query}" is a fascinating topic! There are several perspectives to consider.`,
    `I'd be happy to help with "${query}". Could you provide more details about what you're looking for?`
  ]
  
  return responses[Math.floor(Math.random() * responses.length)]
}

onMounted(() => {
  // Welcome message
  messages.value.push({
    id: messageId.value++,
    role: 'assistant',
    content: 'Hello! I\'m imaiAI, your personal assistant. How can I help you today?',
    timestamp: new Date()
  })
})
</script>

<template>
  <div class="imai-ai-container">
    <div class="imai-ai-header">
      <h2>{{ $t('imaiAI') }}</h2>
    </div>
    
    <div class="imai-ai-messages">
      <div 
        v-for="message in messages" 
        :key="message.id" 
        :class="['message', message.role === 'user' ? 'user-message' : 'assistant-message']"
      >
        <div class="message-avatar">
          <SVGIcon v-if="message.role === 'assistant'" name="robot" />
          <SVGIcon v-else name="person" />
        </div>
        <div class="message-content">
          <div class="message-text">{{ message.content }}</div>
          <div class="message-time">{{ new Date(message.timestamp).toLocaleTimeString() }}</div>
        </div>
      </div>
      
      <div v-if="isLoading" class="loading-indicator">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
    
    <div class="imai-ai-input">
      <input 
        v-model="newMessage" 
        type="text" 
        :placeholder="$t('typeYourMessage')" 
        @keyup.enter="sendMessage"
      />
      <button @click="sendMessage" :disabled="newMessage.trim() === '' || isLoading">
        <SVGIcon name="send" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.imai-ai-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: rgba(var(--bg-color), var(--main-area-opacity));
  border-radius: var(--border-radius-large);
}

.imai-ai-header {
  padding: 1rem;
  border-bottom: 1px solid rgba(var(--fg-color), 0.1);
  
  h2 {
    margin: 0;
    font-size: 1.2rem;
    color: rgb(var(--fg-color));
  }
}

.imai-ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  display: flex;
  gap: 0.5rem;
  max-width: 80%;
  
  &.user-message {
    align-self: flex-end;
    flex-direction: row-reverse;
    
    .message-content {
      background-color: rgba(var(--accent-color), 0.1);
    }
  }
  
  &.assistant-message {
    align-self: flex-start;
    
    .message-content {
      background-color: rgba(var(--fg-color), 0.05);
    }
  }
}

.message-avatar {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  
  :deep(svg) {
    width: 1.5rem;
    height: 1.5rem;
    fill: rgb(var(--fg-color));
  }
}

.message-content {
  padding: 0.75rem;
  border-radius: var(--border-radius-middle);
}

.message-text {
  color: rgb(var(--fg-color));
  line-height: 1.4;
  word-break: break-word;
}

.message-time {
  font-size: 0.75rem;
  color: rgba(var(--fg-color), 0.6);
  margin-top: 0.25rem;
  text-align: right;
}

.loading-indicator {
  align-self: flex-start;
  padding: 0.5rem;
}

.typing-indicator {
  display: flex;
  gap: 0.25rem;
  
  span {
    width: 0.5rem;
    height: 0.5rem;
    background-color: rgba(var(--fg-color), 0.5);
    border-radius: 50%;
    display: inline-block;
    animation: typing 1.5s infinite ease-in-out;
    
    &:nth-child(1) {
      animation-delay: 0s;
    }
    
    &:nth-child(2) {
      animation-delay: 0.3s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.6s;
    }
  }
}

@keyframes typing {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-0.5rem);
  }
}

.imai-ai-input {
  padding: 1rem;
  display: flex;
  gap: 0.5rem;
  border-top: 1px solid rgba(var(--fg-color), 0.1);
  
  input {
    flex: 1;
    padding: 0.75rem;
    border-radius: var(--border-radius-middle);
    border: 1px solid rgba(var(--fg-color), 0.2);
    background-color: rgba(var(--bg-color), 1);
    color: rgb(var(--fg-color));
    
    &:focus {
      outline: none;
      border-color: rgb(var(--accent-color));
    }
  }
  
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem;
    border-radius: var(--border-radius-middle);
    border: none;
    background-color: rgb(var(--accent-color));
    cursor: pointer;
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    :deep(svg) {
      width: 1.25rem;
      height: 1.25rem;
      fill: white;
    }
  }
}
</style>
