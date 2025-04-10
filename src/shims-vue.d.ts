declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Declare component modules
declare module '@/components/images/SVGIcon.vue'
declare module '@/components/images/LazyImage.vue'
declare module '@/components/popups/AIDraftBotSettingsPopup.vue'
declare module '@/components/post/AIDraftOptions.vue'

// Declare types used in the application
declare interface MainState {
  atp: any;
  currentPath: string;
  currentProfile?: any;
  currentSetting: any;
  router: any;
  openSendPostPopup: (options: any) => void;
  showNotification: (options: any) => void;
}

declare type TTPost = any;
declare type TTProfile = any;
declare type TTImage = any;
declare type TIVideo = any;
declare type TTExternal = any;
declare type TIStarterPack = any;
declare type TTLabel = any;
declare type TILabelSetting = any;
declare type TTImagePopupPropsImages = any;
declare type TTList = any;
declare type TTPostType = 'post' | 'reply' | 'quote';
