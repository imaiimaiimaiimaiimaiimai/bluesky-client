import { sendMessageToGemini } from './geminiService';
import { v4 as uuidv4 } from 'uuid';

// Draft interfaces
export interface DraftAuthor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface ReplyToContent {
  uri: string;  // AT Protocol URI format: at://did:plc:xxx/app.bsky.feed.post/xxx
  author: DraftAuthor;
  content: string;
  cid?: string;  // Content ID from AT Protocol
}

export type DraftType = 'post' | 'reply' | 'quote';

export interface Draft {
  id: string;  // Local draft ID (not AT Protocol ID)
  type: DraftType;
  content: string;
  images?: string[];
  createdAt: Date;
  aiGenerated: boolean;
  replyTo?: ReplyToContent;
  nsid?: string;  // Namespaced ID (usually 'app.bsky.feed.post')
}

// Bot configuration
interface BotConfig {
  enabled: boolean;
  maxDraftsPerDay: number;
  interestsKeywords: string[];
  tonality: 'casual' | 'formal' | 'enthusiastic';
  maxLength: number;
  includeTrendingTopics: boolean;
  analyzeHomeFeed: boolean;
  monitorFrequencyMinutes: number;
}

// Default bot configuration
const defaultBotConfig: BotConfig = {
  enabled: true,
  maxDraftsPerDay: 10,  // As per requirement
  interestsKeywords: ['technology', 'programming', 'AI', 'web development'],
  tonality: 'casual',
  maxLength: 280,
  includeTrendingTopics: true,
  analyzeHomeFeed: true,
  monitorFrequencyMinutes: 30
};

// Counters for AI-generated content
let todayDraftCount = 0;
let lastCountResetDay = new Date().getDate();

/**
 * Reset draft counter if it's a new day
 */
function checkAndResetDailyCounter() {
  const today = new Date().getDate();
  if (today !== lastCountResetDay) {
    todayDraftCount = 0;
    lastCountResetDay = today;
  }
}

/**
 * Generate AI draft content based on trending topics
 * @param topic The trending topic to create content about
 * @param config Bot configuration
 * @returns The generated content
 */
async function generateTrendingPost(topic: string, config: BotConfig): Promise<string> {
  const prompt = `
    Create a short, interesting social media post about the trending topic: "${topic}".
    
    Requirements:
    - Make it ${config.tonality} in tone
    - Maximum length: ${config.maxLength} characters
    - Don't use hashtags unless they're part of the topic
    - Make it engaging but natural sounding
    - Don't include any introduction phrases like "Here's a post about..." or "I'd write..."
    - Just write the post content directly
    
    The post:
  `;
  
  return await sendMessageToGemini(prompt);
}

/**
 * Generate AI reply to an existing post
 * @param originalPost The post to reply to
 * @param authorName The author of the original post
 * @param config Bot configuration
 * @returns The generated reply
 */
async function generateReply(originalPost: string, authorName: string, config: BotConfig): Promise<string> {
  const prompt = `
    Create a thoughtful, relevant reply to this social media post by ${authorName}:
    "${originalPost}"
    
    Requirements:
    - Make it ${config.tonality} in tone
    - Maximum length: ${config.maxLength} characters
    - Don't use hashtags
    - Make it sound natural and conversational
    - Don't include any introduction phrases like "Here's a reply..." or "I'd respond with..."
    - Focus on directly engaging with the content of the post
    - Just write the reply content directly
    
    The reply:
  `;
  
  return await sendMessageToGemini(prompt);
}

/**
 * Generate a quote post (repost with comment)
 * @param originalPost The post to quote
 * @param authorName The author of the original post
 * @param config Bot configuration
 * @returns The generated quote comment
 */
async function generateQuote(originalPost: string, authorName: string, config: BotConfig): Promise<string> {
  const prompt = `
    Create a brief, thoughtful comment to accompany this reposted social media content by ${authorName}:
    "${originalPost}"
    
    Requirements:
    - Make it ${config.tonality} in tone
    - Maximum length: ${config.maxLength} characters
    - Don't use hashtags unless very relevant
    - Add value beyond just saying "Great post!"
    - Focus on why this post is interesting or valuable
    - Don't include any introduction phrases like "Here's my comment..." or "I'd repost this with..."
    - Just write the quote comment directly
    
    The quote comment:
  `;
  
  return await sendMessageToGemini(prompt);
}

/**
 * Create a draft post about a trending topic
 * @param topic The trending topic
 * @param config Bot configuration
 * @returns The created draft
 */
export async function createTrendingDraft(topic: string, config: BotConfig = defaultBotConfig): Promise<Draft | null> {
  checkAndResetDailyCounter();
  
  if (!config.enabled || todayDraftCount >= config.maxDraftsPerDay) {
    return null;
  }
  
  try {
    const content = await generateTrendingPost(topic, config);
    
    const draft: Draft = {
      id: uuidv4(),
      type: 'post',
      content: content.trim(),
      createdAt: new Date(),
      aiGenerated: true,
      nsid: 'app.bsky.feed.post'
    };
    
    todayDraftCount++;
    return draft;
  } catch (error) {
    console.error('Error generating trending draft:', error);
    return null;
  }
}

/**
 * Create a draft reply to an existing post
 * @param originalContent The post to reply to
 * @param config Bot configuration
 * @returns The created draft
 */
export async function createReplyDraft(
  originalContent: string, 
  uri: string,
  author: DraftAuthor, 
  cid?: string,
  config: BotConfig = defaultBotConfig
): Promise<Draft | null> {
  checkAndResetDailyCounter();
  
  if (!config.enabled || todayDraftCount >= config.maxDraftsPerDay) {
    return null;
  }
  
  try {
    const authorName = author.displayName || author.handle;
    const content = await generateReply(originalContent, authorName, config);
    
    const draft: Draft = {
      id: uuidv4(),
      type: 'reply',
      content: content.trim(),
      createdAt: new Date(),
      aiGenerated: true,
      nsid: 'app.bsky.feed.post',
      replyTo: {
        uri,
        author,
        content: originalContent,
        cid
      }
    };
    
    todayDraftCount++;
    return draft;
  } catch (error) {
    console.error('Error generating reply draft:', error);
    return null;
  }
}

/**
 * Create a draft quote post (repost with comment)
 * @param originalPost The post to quote
 * @param config Bot configuration
 * @returns The created draft
 */
export async function createQuoteDraft(
  originalContent: string, 
  uri: string,
  author: DraftAuthor,
  cid?: string,
  config: BotConfig = defaultBotConfig
): Promise<Draft | null> {
  checkAndResetDailyCounter();
  
  if (!config.enabled || todayDraftCount >= config.maxDraftsPerDay) {
    return null;
  }
  
  try {
    const authorName = author.displayName || author.handle;
    const content = await generateQuote(originalContent, authorName, config);
    
    const draft: Draft = {
      id: uuidv4(),
      type: 'quote',
      content: content.trim(),
      createdAt: new Date(),
      aiGenerated: true,
      nsid: 'app.bsky.feed.post',
      replyTo: {
        uri,
        author,
        content: originalContent,
        cid
      }
    };
    
    todayDraftCount++;
    return draft;
  } catch (error) {
    console.error('Error generating quote draft:', error);
    return null;
  }
}

/**
 * Automatically analyze a feed and generate drafts for relevant posts
 * @param posts Array of posts from the feed
 * @param config Bot configuration
 * @returns Array of created drafts
 */
export async function analyzeFeedAndCreateDrafts(posts: any[], config: BotConfig = defaultBotConfig): Promise<Draft[]> {
  if (!config.enabled || !Array.isArray(posts) || posts.length === 0) {
    return [];
  }
  
  checkAndResetDailyCounter();
  const remainingDrafts = config.maxDraftsPerDay - todayDraftCount;
  if (remainingDrafts <= 0) {
    return [];
  }
  
  const relevantPosts = posts
    .filter(post => post.record?.text && post.author)
    .filter(post => isContentRelevantToUserInterests(post.record.text, config))
    .slice(0, remainingDrafts);
  
  const drafts: Draft[] = [];
  
  for (const post of relevantPosts) {
    // Randomly choose between reply and quote
    const draftType = Math.random() > 0.5 ? 'reply' : 'quote';
    
    try {
      let draft: Draft | null = null;
      
      if (draftType === 'reply') {
        draft = await createReplyDraft(
          post.record.text,
          post.uri,
          {
            did: post.author.did,
            handle: post.author.handle,
            displayName: post.author.displayName,
            avatar: post.author.avatar
          },
          post.cid,
          config
        );
      } else {
        draft = await createQuoteDraft(
          post.record.text,
          post.uri,
          {
            did: post.author.did,
            handle: post.author.handle,
            displayName: post.author.displayName,
            avatar: post.author.avatar
          },
          post.cid,
          config
        );
      }
      
      if (draft) {
        drafts.push(draft);
      }
    } catch (error) {
      console.error(`Error creating ${draftType} draft:`, error);
    }
  }
  
  return drafts;
}

/**
 * Get user bot configuration from storage
 * @returns The bot configuration
 */
export function getBotConfig(): BotConfig {
  const storedConfig = localStorage.getItem('aiDraftBotConfig');
  if (storedConfig) {
    return JSON.parse(storedConfig);
  }
  return { ...defaultBotConfig };
}

/**
 * Save user bot configuration to storage
 * @param config The bot configuration to save
 */
export function saveBotConfig(config: BotConfig): void {
  localStorage.setItem('aiDraftBotConfig', JSON.stringify(config));
}

/**
 * Check if the bot should create a draft based on the content
 * @param content The content to check
 * @param config Bot configuration
 * @returns True if the content matches user interests
 */
export function isContentRelevantToUserInterests(content: string, config: BotConfig = getBotConfig()): boolean {
  const lowerContent = content.toLowerCase();
  return config.interestsKeywords.some(keyword => 
    lowerContent.includes(keyword.toLowerCase())
  );
}

/**
 * Get the number of drafts generated today
 * @returns The count of drafts generated today
 */
export function getDailyDraftCount(): number {
  checkAndResetDailyCounter();
  return todayDraftCount;
}

/**
 * Get the remaining number of drafts that can be generated today
 * @returns The remaining draft count
 */
export function getRemainingDailyDraftCount(config: BotConfig = getBotConfig()): number {
  checkAndResetDailyCounter();
  return Math.max(0, config.maxDraftsPerDay - todayDraftCount);
}
