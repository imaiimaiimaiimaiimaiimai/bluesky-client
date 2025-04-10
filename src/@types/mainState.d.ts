interface MainState {
  // General app state
  currentPath: string;
  currentQuery: Record<string, any>;
  currentSetting: {
    colorTheme: string;
    backgroundImage?: string;
    backgroundOpacity?: number;
    mainAreaOpacity?: number;
    fontSize?: string;
    fontKerning?: boolean;
    fontAntialiasing?: boolean;
    hideNotificationBadge?: boolean;
    [key: string]: any;
  };
  updateKey: number;
  mounted: boolean;
  
  // User and profile related
  atp: {
    session?: {
      did: string;
      handle: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  userProfile?: {
    handle?: string;
    displayName?: string;
    avatar?: string;
    [key: string]: any;
  };
  currentProfile: any;
  currentLabeler?: any;
  profileFolding: boolean;
  inSameProfilePage: boolean;
  
  // Posts and feeds
  currentPosts: any[];
  timelineFeeds: any[];
  hasTimelineNewArrival: boolean;
  currentSearchTerm?: string;
  currentSearchPostFormState: Record<string, any>;
  
  // Notifications
  notificationCount: number;
  notificationPopupDisplay: boolean;
  
  // Chat
  myChat: {
    unread: number;
    [key: string]: any;
  } | null;
  
  // UI state for popups and popovers
  repostUsersPopupDisplay: boolean;
  quoteRepostsPopupDisplay: boolean;
  likeUsersPopupDisplay: boolean;
  imagePopupProps: {
    display: boolean;
    [key: string]: any;
  };
  sendPostPopupProps: {
    visibility: boolean;
    [key: string]: any;
  };
  loginPopupAutoDisplay: boolean;
  sendPostPopupProcessing: boolean;
  loaderDisplay: boolean;
  myFeedsPopupDisplay: boolean;
  htmlPopupProps: {
    display: boolean;
    type: string;
    [key: string]: any;
  };
  progressPopupDisplay: boolean;
  
  // Worker
  myWorker: {
    close: () => void;
    [key: string]: any;
  } | null;
  
  // Methods
  $setCurrentLanguage: Function;
  $getCurrentLanguage: Function;
  updatePageTitle: Function;
  saveSettings: Function;
  updateSettings: Function;
  resetProfileState: Function;
  clearNotificationInterval: Function;
  clearTimelineInterval: Function;
  endChatListTimer: Function;
  openNotificationPopup: Function;
  openChatListPopup: Function;
  openSettingsPopover: Function;
  openAccountPopup: Function;
  openSendPostPopup: (options: { type: string; text?: string; replyTo?: string; quoteUri?: string; [key: string]: any }) => Promise<void>;
  closeMyFeedsPopup: Function;
  closeHtmlPopup: Function;
  
  [key: string]: any;
}
