<script lang="ts" setup>
import { computed, inject, nextTick, onMounted, reactive, ref, watch, type ComputedRef, type Ref } from "vue"
import { format } from "date-fns/format"
import EasyForm from "@/components/forms/EasyForm.vue"
import LabelButton from "@/components/buttons/LabelButton.vue"
import LinkCard from "@/components/cards/LinkCard.vue"
import Loader from "@/components/shells/Loader.vue"
import Popup from "@/components/popups/Popup.vue"
import Post from "@/components/compositions/Post.vue"
import SVGIcon from "@/components/images/SVGIcon.vue"
import Util from "@/composables/util"
import * as geminiService from "@/services/geminiService"; // Import Gemini Service
import EmojiPicker from 'vue3-emoji-picker'; // Import Emoji Picker
import 'vue3-emoji-picker/css'; // Import Emoji Picker CSS

const emit = defineEmits<{(event: string, done: boolean, hidden: boolean): void}>()

const props = defineProps<{
  type: TTPostType
  post?: TTPost
  text?: string
  url?: string
  fileList?: FileList
}>()

const $t = inject("$t") as Function

const mainState = inject("state") as MainState

const state = reactive<{
  labels: Array<string>
  draftReactionControl: TTDraftReactionControl
  isDraftReactionControlOn: ComputedRef<boolean>
  postDatePopupDate: ComputedRef<undefined | string>
  hiddenFeaturesDisplay: boolean
  videoLimits?: TIVideoLimits
  isRecording: boolean
  isRefining: boolean
  originalText: string | null
  showUndoRefine: boolean
  showEmojiPicker: boolean
}>({
  labels: [],
  draftReactionControl: {
    postgateAllow: true,
    threadgateAction: "none",
    allowMention: false,
    allowFollowing: false,
    listUris: [],
  },
  isDraftReactionControlOn: computed((): boolean => {
    return (
      !state.draftReactionControl.postgateAllow ||
      state.draftReactionControl.threadgateAction !== "none"
    )
  }),
  postDatePopupDate: computed((): undefined | string => {
    if (mainState.postDatePopupDate == null) return
    const date = new Date(mainState.postDatePopupDate)
    if (Number.isNaN(date.getTime())) return
    return format(date, "yyyy-MM-dd'T'HH:mm:ss'Z'")
  }),
  hiddenFeaturesDisplay: false,
  videoLimits: undefined,
  isRecording: false,
  isRefining: false,
  originalText: null,
  showUndoRefine: false,
  showEmojiPicker: false,
})

const easyFormState = reactive<{
  text: string
  url: string
  urlHasImage: Array<boolean>
  medias: Array<File>
  alts: Array<string>
}>({
  text: props.text ?? "",
  url: props.url ?? "",
  urlHasImage: [true],
  medias: [],
  alts: [],
})

const easyFormProps: TTEasyForm = {
  hasSubmitButton: true,
  submitButtonLabel: $t("postContent"),
  submitCallback,
  blurOnSubmit: true,
  data: [
    {
      state: easyFormState,
      model: "text",
      type: "textarea",
      placeholder: $t("text"),
      maxlength: 300,
      maxLengthIndicator: true,
      maxLengthIndicatorByGrapheme: true,
      rows: 6,
      hasMentionSuggestion: true,
      focus: true,
      autoResizeTextarea: true,
      onBlur: onBlurOrInputText,
      onInput: onBlurOrInputText,
    },
    {
      state: easyFormState,
      model: "url",
      type: "text",
      parentClasses: "group-parts",
      placeholder: $t("LinkCardPlaceHolder"),
      autocomplete: "url",
      inputmode: "url",
      onInput: onInputUrl,
    },
    {
      state: easyFormState,
      model: "urlHasImage",
      type: "checkbox",
      options: [{ label: $t("urlHasImage"), value: true }],
      display: false,
    },
    {
      state: easyFormState,
      model: "medias",
      type: "file",
      placeholder: $t("imageBoxes"),
      // accept: "image/bmp, image/gif, image/jpeg, image/png, image/svg+xml, image/webp",
      isMultipleFile: true,
      maxNumberOfFile: 4,
      quadLayout: true,
      onChange: onChangeImage,
    },
  ],
}

const popup = ref()

const easyForm = ref()

// ポップアップを開いた際のUX改善処置
watch(() => mainState.sendPostPopupProps.visibility, (value?: boolean) => {
  if (!value) return
  setTimeout(() => {
    // 「メンションを送る」使用時の対策
    if (props.text) easyFormState.text = `${props.text} ${easyFormState.text}`

    // 「リンクカードにする」使用時の対策
    if (props.url) easyFormState.url = props.url

    // プレビューリンクカード
    PreviewLinkCardFeature.execute()

    popup.value?.scrollToTop()
    easyForm.value?.setFocus()
  }, 0)
})

// D&D用処置
watch(() => props.fileList, (value?: FileList) => {
  const files = value != null ? Array.from(value) : []
  files.unshift(...easyFormState.medias)
  easyFormState.medias = files
  onInputUrl()
  onChangeImage()
})

onMounted(async () => {
  if (props.fileList != null) {
    easyFormState.medias = Array.from(props.fileList)
  }
  onInputUrl()
  onChangeImage()

  // 動画ファイルのアップロード権限と各種リミットの取得
  const videoLimits = await mainState.atp.fetchVideoLimits()
  if (videoLimits instanceof Error) {
    state.videoLimits = undefined
  } else {
    state.videoLimits = videoLimits
  }
})

async function close () {
  emit("closeSendPostPopup", false, true)
}

async function reset () {
  const result = await mainState.openConfirmationPopup({
    title: $t("sendPostReset"),
    text: $t("sendPostResetMessage"),
  })
  if (!result) {
    return
  }
  emit("closeSendPostPopup", false, false)
  await nextTick()
  mainState.openSendPostPopup({
    type: "post",
    post: props.post,
  })
}

async function submitCallback () {
  Util.blurElement()

  // 空ポストの確認ポップアップを表示
  if (easyFormState.text.trim() === "" &&
      easyFormState.medias.length === 0 &&
      easyFormState.url.trim() === ""
  ) {
    const result = await mainState.openConfirmationPopup({
      title: $t("emptyPostConfirmation"),
      text: $t("emptyPostConfirmationMessage"),
    })
    if (!result) {
      return
    }
  }

  // 送信中であれば中断
  if (mainState.sendPostPopupProcessing) {
    return
  }

  // 動画の aspectRatio 対応
  // WANT: `_videoAspectRatio` の注入なしで換装したい
  const videoSizes = (easyForm.value?.getVideoSizes() ?? [[]])[0]
  easyFormState.medias.forEach((media, index) => {
    (media as any)._videoAspectRatio = videoSizes[index]
  })

  // ポップアップを閉じる
  close()

  mainState.sendPostPopupProcessing = true
  try {
    const result = await mainState.atp.createPost({
      ...easyFormState,
      type: props.type,
      post: props.post,
      createdAt: state.postDatePopupDate,
      languages: mainState.currentSetting.postLanguages,
      labels: state.labels,
      lightning: mainState.currentSetting.lightning,
      listMentionDids: mainState.listMentionPopupProps.dids,
    })
    if (result instanceof Error) {
      mainState.openSendPostPopup()
      mainState.openErrorPopup($t(result.message), "SendPostPopup/submitCallback")
    } else {
      // Postgate の適用
      if (!state.draftReactionControl.postgateAllow) {
        const responseOfPostgate = await mainState.atp.updatePostgate(
          result.uri,
          state.draftReactionControl.postgateAllow
        )
        if (responseOfPostgate instanceof Error) {
          mainState.openErrorPopup(responseOfPostgate, "SendPostPopup/submitCallback")
          return
        }
      }

      // Threadgate の適用
      if (state.draftReactionControl.threadgateAction !== "none") {
        const responseOfThreadgate = await mainState.atp.updateThreadgate(
          result.uri,
          state.draftReactionControl.allowMention,
          state.draftReactionControl.allowFollowing,
          state.draftReactionControl.listUris
        )
        if (responseOfThreadgate instanceof Error) {
          mainState.openErrorPopup(responseOfThreadgate, "SendPostPopup/submitCallback")
          return
        }
      }

      // ポスト送信後にフォロー中フィードを更新
      mainState.fetchTimeline("new")

      emit("closeSendPostPopup", true, false)
    }
  } finally {
    mainState.sendPostPopupProcessing = false
  }
}

function onInputUrl () {
  // プレビューリンクカード
  PreviewLinkCardFeature.threshold()

  // リンクカードの画像添付チェックボックスの出し分け
  const urlHasImageItem = easyFormProps.data.find((item: TTEasyFormItem) => {
    return item.model === "urlHasImage"
  })
  if (urlHasImageItem == null) return
  urlHasImageItem.display = !!easyFormState.url && easyFormState.medias.length === 0

  // TODO: 要修正
  easyForm.value?.forceUpdate()
}

function onClickClearButton () {
  Util.blurElement()
  easyFormState.url = ""
  onInputUrl()
}

function onChangeImage () {
  // ファイルがひとつ以上選択されているか否かでリンクカード／フィードカードの表示状態を切り替える
  const urlItem = easyFormProps.data.find((item: TTEasyFormItem) => {
    return item.model === "url"
  })
  if (urlItem == null) return
  urlItem.display = easyFormState.medias.length === 0

  // alt の更新
  // TODO: 意図しない alt が削除される不具合を修正すること
  easyFormState.alts.splice(easyFormState.medias.length)
  easyFormProps.data.splice(
    0,
    easyFormProps.data.length,
    ...easyFormProps.data.filter((data: TTEasyFormItem) => data.name !== "alt")
  )
  easyFormState.medias.forEach((_: File, index: number) => {
    if (easyFormState.alts[index] == null) easyFormState.alts[index] = ""
    easyFormProps.data.push({
      name: "alt",
      state: easyFormState.alts,
      model: index,
      type: "textarea",
      placeholder: `${$t('alts')} ${index + 1}`,
      maxlength: 5000,
      maxLengthIndicator: true,
      maxLengthIndicatorByGrapheme: true,
      rows: 3,
      autoResizeTextarea: true,
    })
  })

  onInputUrl()
}

function openReactionControlPopup () {
  mainState.openReactionControlPopup({
    mode: "send",
    isReply: false,
    draftReactionControl: state.draftReactionControl,
    onClosed (params?: TICloseReactionControlPopupProps) {
      if (params == null) {
        return
      }
      state.draftReactionControl.postgateAllow = params.postgateAllow
      state.draftReactionControl.threadgateAction = params.threadgateAction
      switch (state.draftReactionControl.threadgateAction) {
        case "none": {
          state.draftReactionControl.allowMention = false
          state.draftReactionControl.allowFollowing = false
          state.draftReactionControl.listUris.splice(0)
          break
        }
        case "custom": {
          state.draftReactionControl.allowMention = params.allowMention ?? false
          state.draftReactionControl.allowFollowing = params.allowFollowing ?? false
          state.draftReactionControl.listUris.splice(
            0,
            state.draftReactionControl.listUris.length,
            ...(params.listUris ?? [])
          )
          break
        }
      }
    },
  })
}

function openListMentionPopup () {
  mainState.openListMentionPopup()
}

// マイワード

let textareaSelectionStart = 0

mainState.myWordPopupCallback = (myWord: string) => {
  const textarea = getTextarea()
  if (textarea != null) {
    const before = easyFormState.text.substring(0, textareaSelectionStart)
    const after = easyFormState.text.substring(textareaSelectionStart)
    if (before !== "" && !before.match(/[\s\r\n]$/)) {
      myWord = " " + myWord
    }
    if (after !== "" && !after.match(/^[\s\r\n]/)) {
      myWord += " "
    }
    easyFormState.text = before + myWord + after
    textareaSelectionStart += myWord.length
  }
}

function onBlurOrInputText () {
  const textarea = getTextarea()
  if (textarea != null) {
    textareaSelectionStart = textarea.selectionStart
  }
}

function getTextarea (): null | HTMLTextAreaElement {
  return document.querySelector("#easy-form--default__0")
}

// 隠し機能のトグル
function toggleHiddenFeatures () {
  state.hiddenFeaturesDisplay = !state.hiddenFeaturesDisplay
}

// プレビューリンクカード
const PreviewLinkCardFeature: {
  timer?: any
  loading: Ref<boolean>
  external: TTExternal
  threshold: () => void
  execute: () => Promise<void>
} = {
  timer: undefined,

  loading: ref(false),

  external: reactive({
    uri: "",
    title: undefined,
    description: undefined,
    thumb: undefined,
  }),

  threshold () {
    if (this.timer != null) {
      clearTimeout(this.timer)
    }
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.execute()
    }, 1000)
  },

  async execute () {
    if (this.external.uri === easyFormState.url) {
      return
    }

    // `http` or `https` から始まるURLライクな文字列のみ処理
    if (!easyFormState.url.match(/https?:\/\/[\w!?/+\-_~;.,*&@#$%()'[\]]+/)) {
      this.external.uri = ""
      return
    }

    this.external.uri = easyFormState.url
    this.external.title = undefined
    this.external.description = undefined
    this.external.thumb = undefined
    this.loading.value = true
    const external = await Util.parseOgp(
      mainState.atp,
      easyFormState.url,
      false
    )
    this.loading.value = false
    if (external instanceof Error) {
      this.external.uri = ""
      return
    }
    this.external.uri = external.uri
    this.external.title = external.title
    this.external.description = external.description

    // プロキシサーバから送られたプレビュー用イメージを設定
    this.external.thumb = external.preview
  },
}

// Gemini Service integration for refining text
async function refinePostWithAI() {
  if (easyFormState.text.trim() === '' || state.isRefining) return;
  state.isRefining = true;
  state.originalText = easyFormState.text; // Store original text for undo
  state.showUndoRefine = false;
  try {
    // Prepare a prompt for Gemini
    const prompt = `Refine the following text for clarity, grammar, and engagement, suitable for a social media post. Keep the core meaning intact. Text: "${easyFormState.text}"`;

    // Call Gemini API - Using a simple generateContent for now
    // TODO: Consider using chat history if refinement becomes iterative
    const refinedText = await geminiService.sendMessageToGemini(prompt);

    if (refinedText) {
      easyFormState.text = refinedText;
      state.showUndoRefine = true; // Show undo option after successful refinement
    } else {
      // Handle cases where Gemini might return an empty response or error
      // Maybe show a notification to the user
      console.error("AI refinement failed to return text.");
       mainState.openErrorPopup("aiRefinementError", "Could not refine text.");
       state.showUndoRefine = false; // Don't show undo if refinement failed
    }
  } catch (error) {
    console.error("Error refining post with AI:", error);
    mainState.openErrorPopup("aiRefinementError", "Error contacting AI service.");
    state.showUndoRefine = false; // Don't show undo on error
  } finally {
    state.isRefining = false;
  }
}

// Placeholder for undoing the AI refinement
function undoRefinement() {
  if (state.originalText !== null) {
    easyFormState.text = state.originalText;
    state.originalText = null;
    state.showUndoRefine = false;
  }
}

// Placeholder for voice input
function startVoiceInput() {
  // Check for browser support (prefixed for broader compatibility)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.error("Speech Recognition API not supported in this browser.");
    mainState.openErrorPopup("voiceInputNotSupported", $t('voiceInputNotSupported'));
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = mainState.currentSetting.locale || 'en-US'; // Use app language if available
  recognition.interimResults = false; // Get final result only
  recognition.maxAlternatives = 1;

  state.isRecording = true;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const transcript = event.results[0][0].transcript;
    const textarea = getTextarea();
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = easyFormState.text;
      // Insert transcript at cursor position, replacing selected text if any
      const textBefore = currentText.substring(0, start);
      const textAfter = currentText.substring(end);
      const separator = textBefore.length > 0 && !/\s$/.test(textBefore) ? " " : ""; // Add space if needed
      easyFormState.text = textBefore + separator + transcript + textAfter;
      // Place cursor after the inserted transcript
      nextTick(() => {
        textarea.selectionStart = textarea.selectionEnd = start + separator.length + transcript.length;
        textarea.focus();
      });
    } else {
       // Fallback if textarea not found (less likely)
       easyFormState.text += (easyFormState.text ? ' ' : '') + transcript;
    }
  };

  recognition.onspeechend = () => {
    recognition.stop();
    state.isRecording = false;
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    console.error('Speech recognition error', event.error);
    mainState.openErrorPopup("voiceInputError", `${$t('voiceInputError')}: ${event.error}`);
    state.isRecording = false;
  };

  recognition.onnomatch = () => {
     console.log('Speech not recognized.');
     mainState.openErrorPopup("voiceInputNoError", "Speech not recognized.");
     state.isRecording = false;
  }

  recognition.start();
}

// Placeholder for opening emoji/sticker picker
function openEmojiPicker() {
  state.showEmojiPicker = !state.showEmojiPicker; // Basic toggle
}

// Updated to handle event from vue3-emoji-picker
function onSelectEmoji(emoji: any) {
  console.log('Selected emoji:', emoji);
  const selectedEmoji = emoji.i; // The actual emoji character
  const textarea = getTextarea();
  if(textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = easyFormState.text;
      easyFormState.text = currentText.substring(0, start) + selectedEmoji + currentText.substring(end);
       // Place cursor after the emoji
      nextTick(() => {
        textarea.selectionStart = textarea.selectionEnd = start + selectedEmoji.length;
        textarea.focus();
      });
  }
  state.showEmojiPicker = false; // Close picker after selection
}

</script>

<template>
  <Popup
    class="send-post-popup"
    ref="popup"
    :hasCloseButton="false"
    :loaderDisplay="mainState.sendPostPopupProcessing"
    :data-type="type"
    @close="close"
  >
    <template #header>
      <div class="post-header">
        <button
          type="button"
          class="close-button"
          @click="close"
        >
          <SVGIcon name="close" />
        </button>
        
        <div class="header-right">
          <button
            type="button"
            class="drafts-button"
            @click="mainState.openDraftsView()"
          >
            {{ $t("drafts") }}
          </button>
        </div>
      </div>
    </template>
    <template #body>
      <div class="post-content">
        <div class="user-avatar" v-if="mainState.userProfile?.avatar">
          <img :src="mainState.userProfile.avatar" alt="User avatar" />
        </div>
        
        <div class="post-form-container">
          <div class="audience-selector">
            <button class="audience-button">
              {{ $t("everyone") }} 
              <SVGIcon name="chevron-down" />
            </button>
          </div>
          
          <EasyForm
            v-bind="easyFormProps"
            ref="easyForm"
          >
            <template #item-content-after-1>
              <!-- Clear button (hidden) -->
              <button
                type="button"
                class="button--bordered hidden"
                @click.prevent="onClickClearButton"
              >
                <SVGIcon name="cross" />
              </button>
            </template>
          </EasyForm>
          
          <div class="post-actions">
            <div class="post-info">
              <!-- Removed "Everyone can reply" label -->
            </div>
          </div>
        </div>
      </div>
      
      <div class="post-footer">
        <div class="post-tools">
          <button 
            class="tool-button" 
            title="Add image"
            @click="onClickAddMediaButton"
          >
            <SVGIcon name="image" />
            <span v-if="state.isRecording" class="recording-indicator">Recording...</span>
          </button>
          <button 
            class="tool-button"
            title="Add emoji"
            @click="openEmojiPicker"
          >
            <SVGIcon name="emoticon-outline" />
          </button>
          <button 
            class="tool-button"
            title="Voice input"
            @click="startVoiceInput"
          >
            <SVGIcon name="microphone" />
          </button>
          <button 
            class="tool-button"
            title="Refine post with AI"
            @click="refinePostWithAI"
          >
            <Loader v-if="state.isRefining" :minimum="true" />
            <SVGIcon v-else name="auto-fix" />
            <span v-if="state.isRefining" class="refining-indicator">Refining...</span>
          </button>
          <button 
            class="tool-button"
            title="Set visibility"
            @click="toggleVisibilityOptions"
          >
            <SVGIcon name="earth" />
          </button>
        </div>
        
        <button
          type="button"
          class="post-button"
          @click="submitCallback"
          :disabled="mainState.sendPostPopupProcessing || !easyFormState.text.length"
        >
          {{ $t("post") }}
        </button>
      </div>
      
      <!-- Real Emoji Picker -->
      <div v-if="state.showEmojiPicker" class="emoji-picker-container">
        <EmojiPicker
          :native="true" @select="onSelectEmoji" />
      </div>
    </template>
  </Popup>
</template>

<style lang="scss" scoped>
.send-post-popup {
  // ポスト種別に応じて配色を変更
  --type-color: var(--fg-color);
  &[data-type="reply"] {
    --type-color: var(--post-color);
  }
  &[data-type="quoteRepost"] {
    --type-color: var(--share-color);
  }

  &:deep() {
    // ポップアップとテキストエリアを縦に最大化
    .popup,
    .popup-body,
    .easy-form,
    .easy-form__body,
    .easy-form__body > dl:first-child,
    .easy-form__body > dl:first-child > dd {
      flex-grow: 1;
    }

    .popup {
      max-height: 90vh;
      border-radius: 16px;
      overflow: hidden;
      background-color: rgba(var(--bg-color), 0.95);
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      transition: all 0.2s ease-in-out;
      transform: translateZ(0); /* Force GPU acceleration for smoother animations */
      position: relative;
      will-change: transform, opacity;
    }

    .popup-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(var(--fg-color), 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      backdrop-filter: blur(5px);
      position: sticky;
      top: 0;
      z-index: 5;
      background-color: rgba(var(--bg-color), 0.98);
    }
    
    .popup-body {
      padding: 0;
      display: flex;
      flex-direction: column;
    }

    .easy-form__body {
      grid-gap: 0;
    }

    // クリアボタン
    .easy-form dl[data-name="url"] dd {
      display: flex;
      flex-direction: row;
    }

    .textarea {
      border: none;
      border-radius: 0;
      padding: 0;
      font-size: 1.25rem;
      resize: none;
      min-height: 120px;
      background-color: transparent;
      color: rgb(var(--fg-color));
      
      &:focus {
        outline: none;
        box-shadow: none;
      }
    }

    // Hide the submit button from EasyForm
    .submit-button {
      display: none;
    }
    
    // Hide form labels
    dt {
      display: none;
    }
    
    // Adjust form padding
    .easy-form__body {
      padding: 0;
    }
    
    dl {
      margin: 0;
    }
    
    .svg-icon {
      width: 1.25rem;
      height: 1.25rem;
      fill: rgb(var(--accent-color));
    }
  }

  .post-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  
  .close-button {
    background: none;
    border: none;
    color: rgb(var(--fg-color));
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      background-color: rgba(var(--fg-color), 0.1);
      
      &::after {
        content: attr(title);
        position: absolute;
        bottom: -30px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(var(--fg-color), 0.8);
        color: rgb(var(--bg-color));
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        white-space: nowrap;
        z-index: 10;
      }
    }
    
    .svg-icon {
      width: 1.25rem;
      height: 1.25rem;
    }
  }
  
  .drafts-button {
    background: none;
    border: none;
    color: rgb(var(--accent-color));
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0;
    
    &:hover {
      color: rgba(var(--accent-color), 0.8);
    }
  }
  
  .post-content {
    display: flex;
    padding: 1rem;
    flex: 1;
    transition: padding 0.2s ease;
  }
  
  .user-avatar {
    margin-right: 0.75rem;
    
    img {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      object-fit: cover;
    }
  }
  
  .post-form-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    transition: all 0.2s ease;
  }
  
  .audience-selector {
    margin-bottom: 0.75rem;
    
    .audience-button {
      display: inline-flex;
      align-items: center;
      background-color: transparent;
      border: 1px solid rgba(var(--accent-color), 0.5);
      border-radius: 9999px;
      color: rgb(var(--accent-color));
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      cursor: pointer;
      
      &:hover {
        background-color: rgba(var(--accent-color), 0.1);
      }
      
      .svg-icon {
        width: 1rem;
        height: 1rem;
        margin-left: 0.25rem;
      }
    }
  }
  
  .post-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    padding: 0.75rem 0;
    border-top: 1px solid rgba(var(--fg-color), 0.1);
  }
  
  .post-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: rgb(var(--accent-color));
    font-size: 0.875rem;
  }
  
  .visibility-info {
    display: flex;
    align-items: center;
    
    .svg-icon {
      width: 1rem;
      height: 1rem;
      margin-right: 0.25rem;
      fill: rgb(var(--accent-color));
    }
  }
  
  .post-footer {
    padding: 0.75rem 1rem;
    border-top: 1px solid rgba(var(--fg-color), 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    backdrop-filter: blur(5px);
    position: sticky;
    bottom: 0;
    z-index: 5;
    background-color: rgba(var(--bg-color), 0.98);
    transition: all 0.2s ease;
  }
  
  .post-footer .post-tools {
    display: flex;
    gap: 1.25rem;
    justify-content: flex-start;
    flex: 1;
  }
  
  .tool-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    
    &:hover {
      background-color: rgba(var(--accent-color), 0.1);
      
      &::after {
        content: attr(title);
        position: absolute;
        bottom: -30px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(var(--fg-color), 0.8);
        color: rgb(var(--bg-color));
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        white-space: nowrap;
        z-index: 10;
      }
    }
    
    .svg-icon {
      width: 1.25rem;
      height: 1.25rem;
      fill: rgb(var(--accent-color));
    }
    
    .recording-indicator {
      font-size: 0.75rem;
      color: rgb(var(--accent-color));
      margin-left: 0.25rem;
    }
    
    .refining-indicator {
      font-size: 0.75rem;
      color: rgb(var(--accent-color));
      margin-left: 0.25rem;
    }
  }
  
  .post-button {
    background-color: rgb(var(--accent-color));
    color: white;
    border: none;
    border-radius: 9999px;
    padding: 0.5rem 1.25rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover:not(:disabled) {
      background-color: rgba(var(--accent-color), 0.9);
      transform: translateY(-1px);
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: none;
    }
    
    &:disabled {
      background-color: rgba(var(--accent-color), 0.5);
      cursor: not-allowed;
    }
  }
  
  .emoji-picker-container {
    position: absolute;
    bottom: 60px;
    left: 1rem;
    z-index: 100;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    background-color: rgba(var(--bg-color), 0.98);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
    transform: translateZ(0);
    width: 300px;
    height: 300px;
    overflow: auto;
  }
  
  /* Container for the emoji picker */
  .emoji-picker-container {
    /* You might want to add positioning styles here if needed */
    /* e.g., position: absolute; bottom: 50px; left: 10px; z-index: 10; */
  }
  
  .tool-buttons {
    display: flex;
    gap: 0.5rem; /* Spacing between buttons */
    flex-wrap: wrap; /* Allow buttons to wrap on smaller screens */
  }
  
  .tool-button-wrapper {
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &.recording svg {
      color: var(--notice-color);
      animation: pulse 1.5s infinite;
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .loader {
      width: 1em; /* Match icon size */
      height: 1em;
    }
  }
  
  /* Basic pulsing animation for recording */
  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.7;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
}
</style>
