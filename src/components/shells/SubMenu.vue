<script lang="ts" setup>
import { inject, reactive } from "vue"
import { useRouter } from "vue-router"
import CopyRight from "@/components/labels/Copyright.vue"
import Logo from "@/components/images/Logo.vue"
import MyFeedList from "@/components/lists/MyFeedList.vue"
import SVGIcon from "@/components/images/SVGIcon.vue"

const $t = inject("$t") as Function

const state = reactive<{
  text: string,
}>({
  text: "",
})

const mainState = inject("state") as MainState

const router = useRouter()

function searchPost () {
  const query = state.text !== ""
    ? { text: state.text }
    : undefined
  router.push({ name: "post-search", query })
}

function openKeywordHistoryPopover ($event: Event) {
  mainState.openKeywordHistoryPopover(
    $event.target,
    mainState.currentSetting.postSearchKeywordHistory,
    (keyword: string) => {
      state.text = keyword
      searchPost()
    }
  )
}
</script>

<template>
  <div class="sub-menu">
    <!-- ロゴ -->
    <Logo />

    <!-- Search card -->
    <div class="card search-card">
      <!-- ポスト検索フォーム -->
      <div class="search-post-form">
        <form @submit.prevent="searchPost">
          <div class="group-parts">
            <!-- キーワードボックス -->
            <input
              v-model="state.text"
              type="search"
              name="searchPost"
              :placeholder="$t('postSearch')"
              autocapitalize="off"
              autocomplete="off"
              inputmode="search"
              spellcheck="false"
              class="textbox"
            >

            <!-- キーワード履歴ポップオーバートリガー -->
            <button
              class="button--bordered"
              type="button"
              @click.prevent="openKeywordHistoryPopover"
            >
              <SVGIcon name="history" />
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Feeds card -->
    <div class="card feeds-card">
      <!-- マイフィードリスト -->
      <MyFeedList />
    </div>

    <!-- コピーライト -->
    <CopyRight />
  </div>
</template>

<style lang="scss" scoped>
.sub-menu {
  display: flex;
  flex-direction: column;
  padding: 2rem 1rem 1rem;
  position: relative;
}

// Card styling for Twitter-like appearance
.card {
  background-color: var(--fg-color-0);
  border: 1px solid var(--border-color-light, rgba(47, 51, 54, 0.2));
  border-radius: 12px;
  margin-bottom: 1rem;
  overflow: hidden;
}

// Search card specific styles
.search-card {
  padding: 0.75rem;
}

// Feeds card specific styles
.feeds-card {
  padding: 0.75rem 0;
  
  :deep(.section-header) {
    padding: 0 0.75rem;
  }
  
  :deep(.feed-item) {
    padding: 0.5rem 0.75rem;
    
    &:hover {
      background-color: var(--bg-color-hover, rgba(255, 255, 255, 0.03));
    }
  }
}

// ロゴ
.logo {
  font-size: 2rem;
  margin-bottom: 2rem;

  &:deep() {
    .svg-icon {
      fill: rgb(var(--fg-color));
    }
  }
}

// ポスト検索フォーム
.search-post-form {
  display: flex;
  grid-gap: 0.5rem;
  margin-bottom: 1rem;

  // キーワードボックス
  & > form {
    flex-grow: 1;

    .textbox {
      font-size: 0.875rem;
      width: 100%;
    }
  }

  // キーワード履歴ポップオーバートリガー
  .button--bordered > .svg-icon {
    font-size: 1.125rem;
  }
}

// マイフィードリスト
.my-feed-list {
  flex-grow: 1;
  margin-bottom: 1rem;
  overflow: hidden;
}

// コピーライト
.copyright {
  font-size: 0.75rem;
}
</style>
