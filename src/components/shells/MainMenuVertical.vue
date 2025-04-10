<script lang="ts" setup>
import { computed, inject, reactive, type ComputedRef } from "vue"
import LazyImage from "@/components/images/LazyImage.vue"
import Loader from "@/components/shells/Loader.vue"
import SVGIcon from "@/components/images/SVGIcon.vue"
import Util from "@/composables/util"

const $t = inject("$t") as Function

const mainState = inject("state") as MainState

const state = reactive<{
  query: ComputedRef<string>
}>({
  query: computed((): string => {
    const queries: string[] = []
    if (mainState.currentSearchTerm) {
      queries.push(`text=${mainState.currentSearchTerm}`)
    }
    Object.keys(mainState.currentSearchPostFormState).forEach((key) => {
      const value = (mainState.currentSearchPostFormState as any)[key]
      if (value) {
        queries.push(`${key}=${value}`)
      }
    })
    const query = queries.join("&")
    return query ? `?${query}` : ""
  }),
})

function openNotificationPopup () {
  Util.blurElement()
  mainState.openNotificationPopup()
}

function openChatListPopup () {
  Util.blurElement()
  mainState.openChatListPopup()
}

function openSettingsPopover () {
  Util.blurElement()
  mainState.openSettingsPopover(
    ".main-menu-vertical__settings-popover-trigger",
    "toRight"
  )
}

function openAccountPopup () {
  Util.blurElement()
  mainState.openAccountPopup()
}

async function openSendPostPopup () {
  Util.blurElement()
  await mainState.openSendPostPopup({ type: "post" })
}

function moveToBottom () {
  window.scrollTo({
    left: 0,
    top: document.body.clientHeight,
    behavior: "smooth",
  })
}
</script>

<template>
  <div class="main-menu-vertical">
    <!-- Profile Button -->
    <RouterLink
      class="profile-button"
      :to="{ name: 'profile-feeds', query: { account: mainState.atp.session?.did } }"
      :data-is-focus="
        (
          mainState.currentPath.startsWith('/profile/') &&
          (
            mainState.currentQuery.account === mainState.atp.session?.handle ||
            mainState.currentQuery.account === mainState.atp.session?.did
          )
        ) ||
        mainState.currentPath.startsWith('/profile/edit')
      "
    >
      <LazyImage :src="mainState.userProfile?.avatar" />
      <div class="label">{{ mainState.userProfile?.handle ?? "&nbsp;" }}</div>
    </RouterLink>

    <!-- Scroller -->
    <div class="main-menu-vertical__scroller">
      <!-- Home Button -->
      <RouterLink
        class="link-button"
        to="/home"
      >
        <div class="icon">
          <SVGIcon name="home" />

          <!-- New Timeline Badge -->
          <div
            v-if="mainState.hasTimelineNewArrival && !mainState.currentSetting.hideNotificationBadge"
            class="timeline-new-arrival-badge"
          />
        </div>
        <div class="label">{{ $t("home") }}</div>
      </RouterLink>

      <!-- Search Button -->
      <RouterLink
        class="link-button"
        :to="`/search/post${state.query}`"
        :data-is-focus="mainState.currentPath.startsWith('/search/')"
      >
        <div class="icon">
          <SVGIcon name="search" />
        </div>
        <div class="label">{{ $t("search") }}</div>
      </RouterLink>

      <!-- Notification Button -->
      <button
        class="link-button"
        @click.prevent="openNotificationPopup"
      >
        <div class="icon">
          <SVGIcon name="bell" />

          <!-- Unread Notification Badge -->
          <div
            v-if="mainState.notificationCount > 0 && !mainState.currentSetting.hideNotificationBadge"
            class="unread-badge"
          >{{ mainState.notificationCount }}</div>
        </div>
        <div class="label">{{ $t("notifications") }}</div>
      </button>

      <!-- Chat Button -->
      <button
        class="link-button"
        @click.prevent="openChatListPopup"
      >
        <div class="icon">
          <SVGIcon name="chat" />

          <!-- Unread Chat Badge -->
          <div
            v-if="mainState.myChat!.unread > 0 && !mainState.currentSetting.hideNotificationBadge"
            class="unread-badge"
          >{{ mainState.myChat!.unread }}</div>
        </div>
        <div class="label">{{ $t("chat") }}</div>
      </button>

      <!-- Feed Button -->
      <RouterLink
        class="link-button"
        :to="{ name: 'feeds' }"
        :data-is-focus="mainState.currentPath.startsWith('/feeds')"
      >
        <div class="icon">
          <SVGIcon name="feed" />
        </div>
        <div class="label">{{ $t("feed") }}</div>
      </RouterLink>

      <!-- imaiAI Button -->
      <RouterLink
        class="link-button"
        :to="{ name: 'imai-ai' }"
        :data-is-focus="mainState.currentPath.startsWith('/imai-ai')"
      >
        <div class="icon">
          <SVGIcon name="imai-logo" />
        </div>
        <div class="label">{{ $t("imaiAI") }}</div>
      </RouterLink>

      <!-- Settings Button -->
      <button
        class="link-button main-menu-vertical__settings-popover-trigger"
        @click.prevent="openSettingsPopover"
      >
        <div class="icon">
          <SVGIcon name="setting" />
        </div>
        <div class="label">{{ $t("settings") }}</div>
      </button>

      <!-- Account Popup Trigger -->
      <button
        class="link-button"
        @click.prevent="openAccountPopup"
      >
        <div class="icon">
          <SVGIcon name="person" />
        </div>
        <div class="label">{{ $t("myAccounts") }}</div>
      </button>

      <!-- Post Send Popup Trigger -->
      <button
        class="post-button"
        @click.prevent="openSendPostPopup"
      >
        <span>{{ $t("Create Post") }}</span>
      </button>

      <!-- Scroll Down Button -->
      <button
        class="move-button move-to-bottom-button"
        @click.prevent="moveToBottom"
      >
        <div class="icon">
          <SVGIcon name="cursorDown" />
        </div>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@mixin slimLayout {
  padding: 0 0.5rem 0.75rem;

  .profile-button {
    --size: 2rem;
    --padding: 0.5rem;
    margin-top: 0.5rem;

    &[data-is-focus="true"],
    &:not([data-is-focus]).router-link-active {
      background-color: rgb(var(--accent-color), 0.25);
    }
  }

  .link-button {
    grid-template-columns: min-content;
  }

  .label {
    display: none;
  }
}

.main-menu-vertical {
  display: flex;
  flex-direction: column;
  grid-gap: 0.5rem;

  // Tablet layout
  @include media-tablet-layout() {
    @include slimLayout;
  }

  // Full layout
  @include media-full-layout() {
    overflow: hidden;
    padding: 1rem 1rem 1.25rem;

    // Internal scroll
    &__scroller {
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: none;
      max-height: 100%;
      @include scroll-bar("transparent");
    }

    .move-to-bottom-button {
      display: none;
    }
  }

  // Scroller
  &__scroller {
    display: flex;
    flex-direction: column;
    grid-gap: 0.5rem;
  }
}

// Profile Button
.profile-button {
  --size: 4.5rem;
  --padding: 1rem;

  display: grid;
  grid-gap: 0.5rem;
  justify-content: center;
  padding: var(--padding);
  &:focus, &:hover {
    & > .label {
      color: rgb(var(--fg-color));
    }
  }
  &[data-is-focus="true"],
  &:not([data-is-focus]).router-link-active {
    & > .label {
      color: rgb(var(--fg-color));
    }
  }

  & > .lazy-image {
    border-radius: var(--border-radius-large);
    font-size: var(--size);
    margin: auto;
    object-fit: cover;
    min-width: var(--size);
    max-width: var(--size);
    min-height: var(--size);
    max-height: var(--size);
    transition: border-radius 125ms ease-out;
  }
  &:hover > .lazy-image {
    border-radius: 1px;
  }

  & > .label {
    color: rgb(var(--fg-color), 0.5);
    font-size: 1.125rem;
    font-weight: bold;
    line-height: var(--line-height-low);
    overflow: hidden;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

// Various buttons
.link-button {
  border-radius: var(--border-radius-middle);
  cursor: pointer;
  display: grid;
  grid-template-columns: min-content 1fr;
  align-items: center;
  justify-content: center;
  grid-gap: 1rem;
  width: 100%;

  .lazy-image {
    border-radius: var(--border-radius-middle);
    font-size: 2rem;
    margin: 0.5rem;
    object-fit: cover;
    min-width: 2rem;
    max-width: 2rem;
    min-height: 2rem;
    max-height: 2rem;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0.5rem;
    position: relative;
    min-width: 2rem;
    min-height: 2rem;

    .svg-icon {
      fill: rgb(var(--fg-color), 0.5);
      font-size: 1.5rem;
    }
  }

  .label {
    color: rgb(var(--fg-color), 0.5);
    font-size: 1.25rem;
    line-height: var(--line-height-low);
    overflow: hidden;
    padding-right: 0.5rem;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: break-all;
  }

  &:focus, &:hover {
    .svg-icon {
      fill: rgb(var(--fg-color));
    }

    .label {
      color: rgb(var(--fg-color));
    }
  }
  &[data-is-focus="true"],
  &:not([data-is-focus]).router-link-active {
    .svg-icon {
      fill: rgb(var(--fg-color));
    }

    .label {
      color: rgb(var(--fg-color));
      font-weight: bold;
    }
  }
}

.post-button {
  background-color: rgb(var(--accent-color));
  border: none;
  border-radius: 9999px;
  color: white;
  cursor: pointer;
  font-weight: 600;
  padding: 0.75rem 0;
  text-align: center;
  width: 100%;
  margin: 0.5rem 0;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(var(--accent-color), 0.9);
  }
  
  span {
    font-size: 1rem;
  }
}

// New Timeline Badge
.timeline-new-arrival-badge {
  background-color: rgb(var(--notice-color));
  border: 1px solid rgb(var(--bg-color));
  border-radius: 100%;
  position: absolute;
  right: 0rem;
  top: 0rem;
  width: 0.625rem;
  height: 0.625rem;
}

// Unread Badge
.unread-badge {
  background-color: rgb(var(--notice-color));
  border: 1px solid rgb(var(--bg-color));
  border-radius: var(--border-radius-large);
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
  line-height: var(--line-height-low);
  padding: 0.125rem 0.25rem;
  position: absolute;
  right: -0.25rem;
  top: -0.25rem;
}

// Scroll Button
.move-button {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  min-height: 3rem;

  .svg-icon {
    fill: rgb(var(--fg-color), 0.25);
  }
  &:focus , &:hover {
    .svg-icon {
      fill: rgb(var(--fg-color));
    }
  }
}
</style>
