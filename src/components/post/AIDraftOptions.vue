<script setup lang="ts">
import { inject, ref } from 'vue';
import { createReplyDraft, createQuoteDraft, getBotConfig, isContentRelevantToUserInterests } from '@/services/aiDraftBotService';
import SVGIcon from '@/components/images/SVGIcon.vue';

// TODO: Add proper type definitions in a future update
// For now, using 'any' to avoid TypeScript errors
const props = defineProps({
  postUri: {
    type: String,
    required: true
  },
  postContent: {
    type: String,
    required: true
  },
  author: {
    type: Object,
    required: true,
    validator: (obj: any) => {
      return obj.did && obj.handle;
    }
  }
});

const mainState = inject('state') as any;
const $t = inject('$t') as Function;

const isGenerating = ref(false);
const showDropdown = ref(false);
const botConfig = getBotConfig();

// Check if this post is relevant to user interests
const isRelevant = isContentRelevantToUserInterests(props.postContent);

// Toggle dropdown
function toggleDropdown(event: Event) {
  event.stopPropagation();
  showDropdown.value = !showDropdown.value;
}

// Close dropdown when clicking outside
function closeDropdown() {
  showDropdown.value = false;
}

// Generate a draft reply to this post
async function generateReply() {
  if (!botConfig.enabled) return;
  
  try {
    isGenerating.value = true;
    showDropdown.value = false;
    
    const draft = await createReplyDraft(
      props.postContent,
      props.postUri,
      {
        did: props.author.did,
        handle: props.author.handle,
        displayName: props.author.displayName,
        avatar: props.author.avatar
      }
    );
    
    if (draft) {
      // Save draft to localStorage (assuming DraftsView handles this)
      const storedDrafts = localStorage.getItem('drafts');
      let drafts = storedDrafts ? JSON.parse(storedDrafts) : [];
      drafts.unshift(draft);
      localStorage.setItem('drafts', JSON.stringify(drafts));
      
      // Show notification
      mainState.showNotification({
        message: $t('aiDraftCreated'),
        type: 'success',
        action: {
          label: $t('viewDrafts'),
          callback: () => {
            mainState.router.push('/drafts');
          }
        }
      });
    }
  } catch (error) {
    console.error('Error generating reply draft:', error);
    mainState.showNotification({
      message: $t('errorGeneratingDraft'),
      type: 'error'
    });
  } finally {
    isGenerating.value = false;
  }
}

// Generate a draft quote post
async function generateQuote() {
  if (!botConfig.enabled) return;
  
  try {
    isGenerating.value = true;
    showDropdown.value = false;
    
    const draft = await createQuoteDraft(
      props.postContent,
      props.postUri,
      {
        did: props.author.did,
        handle: props.author.handle,
        displayName: props.author.displayName,
        avatar: props.author.avatar
      }
    );
    
    if (draft) {
      // Save draft to localStorage
      const storedDrafts = localStorage.getItem('drafts');
      let drafts = storedDrafts ? JSON.parse(storedDrafts) : [];
      drafts.unshift(draft);
      localStorage.setItem('drafts', JSON.stringify(drafts));
      
      // Show notification
      mainState.showNotification({
        message: $t('aiDraftCreated'),
        type: 'success',
        action: {
          label: $t('viewDrafts'),
          callback: () => {
            mainState.router.push('/drafts');
          }
        }
      });
    }
  } catch (error) {
    console.error('Error generating quote draft:', error);
    mainState.showNotification({
      message: $t('errorGeneratingDraft'),
      type: 'error'
    });
  } finally {
    isGenerating.value = false;
  }
}
</script>

<template>
  <div v-if="botConfig.enabled" class="ai-draft-options" v-click-outside="closeDropdown">
    <button 
      class="ai-actions-button" 
      :class="{ 'is-relevant': isRelevant }"
      @click="toggleDropdown"
      :disabled="isGenerating"
      :title="$t('aiDraftOptions')"
    >
      <SVGIcon v-if="isGenerating" name="loading" class="spinning" />
      <SVGIcon v-else name="robot" />
    </button>
    
    <div v-if="showDropdown" class="ai-actions-dropdown">
      <div class="dropdown-header">
        <SVGIcon name="robot" />
        <span>{{ $t('aiDraftOptions') }}</span>
      </div>
      
      <button class="dropdown-item" @click="generateReply">
        <SVGIcon name="reply" />
        <span>{{ $t('generateReply') }}</span>
      </button>
      
      <button class="dropdown-item" @click="generateQuote">
        <SVGIcon name="format-quote-close" />
        <span>{{ $t('generateQuote') }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ai-draft-options {
  position: relative;
}

.ai-actions-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: none;
  background-color: transparent;
  color: var(--text-color-muted);
  cursor: pointer;
  
  &:hover {
    background-color: var(--bg-color-hover);
    color: var(--accent-color);
  }
  
  &.is-relevant {
    color: var(--accent-color);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .spinning {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
}

.ai-actions-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 200px;
  background-color: var(--fg-color-0);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 10;
  overflow: hidden;
  margin-top: 0.5rem;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  font-weight: 500;
  border-bottom: 1px solid var(--border-color);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  color: var(--text-color);
  
  &:hover {
    background-color: var(--bg-color-hover);
  }
}
</style>
