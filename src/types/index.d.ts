// Main application state interface
export interface MainState {
  atp: any;
  currentPath: string;
  currentProfile?: any;
  currentSetting: any;
  router: any;
  openSendPostPopup: (options: any) => void;
  showNotification: (options: any) => void;
}

// Post types
export type TTPostType = 'post' | 'reply' | 'quote';
export type TTPost = any;
export type TTProfile = any;
export type TTImage = any;
export type TIVideo = any;
export type TTExternal = any;
export type TIStarterPack = any;
export type TTLabel = any;
export type TILabelSetting = any;
export type TTImagePopupPropsImages = any;
export type TTList = any;
