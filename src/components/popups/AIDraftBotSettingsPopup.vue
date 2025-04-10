<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getBotConfig, saveBotConfig } from '@/services/aiDraftBotService';

const emit = defineEmits(['close']);

// Bot configuration
const enabled = ref(true);
const maxDraftsPerDay = ref(5);
const interestsKeywords = ref<string[]>([]);
const newKeyword = ref('');
const tonality = ref('casual');
const maxLength = ref(280);
const includeTrendingTopics = ref(true);
const analyzeHomeFeed = ref(false);
const monitorFrequencyMinutes = ref(15);

// Load configuration on mount
onMounted(() => {
  const config = getBotConfig();
  enabled.value = config.enabled;
  maxDraftsPerDay.value = config.maxDraftsPerDay;
  interestsKeywords.value = [...config.interestsKeywords];
  tonality.value = config.tonality;
  maxLength.value = config.maxLength;
  includeTrendingTopics.value = config.includeTrendingTopics;
  analyzeHomeFeed.value = config.analyzeHomeFeed;
  monitorFrequencyMinutes.value = config.monitorFrequencyMinutes;
});

// Add keyword to interests
function addKeyword() {
  if (newKeyword.value.trim() && !interestsKeywords.value.includes(newKeyword.value.trim())) {
    interestsKeywords.value.push(newKeyword.value.trim());
    newKeyword.value = '';
  }
}

// Remove keyword from interests
function removeKeyword(keyword: string) {
  interestsKeywords.value = interestsKeywords.value.filter(k => k !== keyword);
}

// Save settings and close popup
function saveSettings() {
  saveBotConfig({
    enabled: enabled.value,
    maxDraftsPerDay: maxDraftsPerDay.value,
    interestsKeywords: interestsKeywords.value,
    tonality: tonality.value as 'casual' | 'formal' | 'enthusiastic',
    maxLength: maxLength.value,
    includeTrendingTopics: includeTrendingTopics.value,
    analyzeHomeFeed: analyzeHomeFeed.value,
    monitorFrequencyMinutes: monitorFrequencyMinutes.value
  });
  
  emit('close');
}
</script>

<template>
  <div class="ai-draft-bot-settings">
    <div class="popup-header">
      <h2>AI Draft Bot Settings</h2>
      <button class="close-button" @click="emit('close')">×</button>
    </div>
    
    <div class="settings-content">
      <!-- Enable/Disable Bot -->
      <div class="setting-group">
        <div class="setting-label">
          <label for="bot-enabled">Enable AI Draft Bot</label>
        </div>
        <div class="setting-control">
          <input type="checkbox" id="bot-enabled" v-model="enabled">
          <div class="setting-description">
            When enabled, the bot will suggest drafts based on your interests and trending topics
          </div>
        </div>
      </div>
      
      <!-- Max Drafts Per Day -->
      <div class="setting-group">
        <div class="setting-label">
          <label for="max-drafts">Maximum drafts per day</label>
        </div>
        <div class="setting-control">
          <input 
            type="number" 
            id="max-drafts" 
            v-model="maxDraftsPerDay" 
            min="1" 
            max="20"
            :disabled="!enabled"
          >
          <div class="setting-description">
            Limit how many drafts the bot can create daily
          </div>
        </div>
      </div>
      
      <!-- Interests Keywords -->
      <div class="setting-group">
        <div class="setting-label">
          <label>Interests Keywords</label>
        </div>
        <div class="setting-control">
          <div class="keywords-input">
            <input 
              type="text" 
              v-model="newKeyword" 
              placeholder="Add keyword"
              :disabled="!enabled"
              @keyup.enter="addKeyword"
            >
            <button @click="addKeyword" :disabled="!enabled">Add</button>
          </div>
          
          <div class="keywords-list">
            <div v-for="keyword in interestsKeywords" :key="keyword" class="keyword-tag">
              <span>{{ keyword }}</span>
              <button @click="removeKeyword(keyword)" :disabled="!enabled">×</button>
            </div>
            <div v-if="interestsKeywords.length === 0" class="no-keywords">
              No interests defined yet
            </div>
          </div>
          
          <div class="setting-description">
            The bot will generate content related to these topics
          </div>
        </div>
      </div>
      
      <!-- Tonality -->
      <div class="setting-group">
        <div class="setting-label">
          <label for="tonality">Content Tone</label>
        </div>
        <div class="setting-control">
          <select id="tonality" v-model="tonality" :disabled="!enabled">
            <option value="casual">Casual</option>
            <option value="formal">Formal</option>
            <option value="enthusiastic">Enthusiastic</option>
          </select>
          <div class="setting-description">
            How the generated content should sound
          </div>
        </div>
      </div>
      
      <!-- Max Length -->
      <div class="setting-group">
        <div class="setting-label">
          <label for="max-length">Maximum Length</label>
        </div>
        <div class="setting-control">
          <input 
            type="number" 
            id="max-length" 
            v-model="maxLength" 
            min="100" 
            max="1000"
            :disabled="!enabled"
          >
          <div class="setting-description">
            Maximum characters for generated content
          </div>
        </div>
      </div>
      
      <!-- Analyze Home Feed -->
      <div class="setting-group">
        <div class="setting-label">
          <label for="analyze-feed">Analyze Home Feed</label>
        </div>
        <div class="setting-control">
          <input 
            type="checkbox" 
            id="analyze-feed" 
            v-model="analyzeHomeFeed"
            :disabled="!enabled"
          >
          <div class="setting-description">
            Analyze your home feed to generate content
          </div>
        </div>
      </div>
      
      <!-- Monitor Frequency -->
      <div class="setting-group" v-if="analyzeHomeFeed">
        <div class="setting-label">
          <label for="monitor-frequency">Monitor Frequency</label>
        </div>
        <div class="setting-control">
          <select id="monitor-frequency" v-model="monitorFrequencyMinutes" :disabled="!enabled || !analyzeHomeFeed">
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
          </select>
          <div class="setting-description">
            How often to monitor your home feed
          </div>
        </div>
      </div>
      
      <!-- Include Trending Topics -->
      <div class="setting-group">
        <div class="setting-label">
          <label for="trending-topics">Include Trending Topics</label>
        </div>
        <div class="setting-control">
          <input 
            type="checkbox" 
            id="trending-topics" 
            v-model="includeTrendingTopics"
            :disabled="!enabled"
          >
          <div class="setting-description">
            Generate content based on current trending topics
          </div>
        </div>
      </div>
    </div>
    
    <div class="popup-footer">
      <button class="cancel-button" @click="emit('close')">Cancel</button>
      <button class="save-button" @click="saveSettings">Save</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ai-draft-bot-settings {
  background-color: var(--fg-color-0);
  border-radius: 12px;
  width: 500px;
  max-width: 95vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  
  h2 {
    margin: 0;
    font-size: 1.2rem;
  }
  
  .close-button {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-color-muted);
    
    &:hover {
      color: var(--text-color);
    }
  }
}

.settings-content {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
}

.setting-group {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-label {
  font-weight: bold;
  
  label {
    display: block;
  }
}

.setting-control {
  input[type="text"],
  input[type="number"],
  select {
    padding: 0.5rem;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background-color: var(--bg-color);
    color: var(--text-color);
    font-size: 0.9rem;
    width: 100%;
    max-width: 300px;
    
    &:disabled {
      opacity: 0.6;
    }
  }
  
  input[type="checkbox"] {
    transform: scale(1.2);
    margin-right: 0.5rem;
  }
}

.setting-description {
  font-size: 0.8rem;
  color: var(--text-color-muted);
  margin-top: 0.25rem;
}

.keywords-input {
  display: flex;
  gap: 0.5rem;
  
  input {
    flex: 1;
  }
  
  button {
    padding: 0.5rem 1rem;
    background-color: var(--accent-color);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    
    &:disabled {
      background-color: var(--border-color);
      cursor: not-allowed;
    }
  }
}

.keywords-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.keyword-tag {
  display: flex;
  align-items: center;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 100px;
  padding: 0.25rem 0.75rem;
  
  span {
    margin-right: 0.5rem;
  }
  
  button {
    background: transparent;
    border: none;
    color: var(--text-color-muted);
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 0;
    
    &:hover {
      color: var(--danger-color);
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.no-keywords {
  color: var(--text-color-muted);
  font-style: italic;
  font-size: 0.9rem;
  padding: 0.5rem 0;
}

.popup-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  gap: 0.5rem;
  
  button {
    padding: 0.5rem 1rem;
    border-radius: 100px;
    font-weight: bold;
    cursor: pointer;
  }
  
  .cancel-button {
    background-color: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-color);
    
    &:hover {
      background-color: var(--bg-color-hover);
    }
  }
  
  .save-button {
    background-color: var(--accent-color);
    border: none;
    color: white;
    
    &:hover {
      background-color: var(--accent-color-dark, #1a8cd8);
    }
  }
}
</style>
