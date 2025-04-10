<script lang="ts" setup>
import { inject, reactive, onMounted } from "vue"
import FeedCard from "@/components/cards/FeedCard.vue"
import SpecialFeedCard from "@/components/cards/SpecialFeedCard.vue"

const $t = inject("$t") as Function
const mainState = inject("state") as any

const state = reactive<{
  myFeeds: any[],
  popularFeeds: any[],
  isLoading: boolean
}>({
  myFeeds: [],
  popularFeeds: [],
  isLoading: true
})

onMounted(async () => {
  // Retrieve feed data
  if (mainState.atp.hasLogin()) {
    state.myFeeds = mainState.myFeeds?.items || []
    state.popularFeeds = mainState.currentPopularFeedGenerators || []
    state.isLoading = false
  }
})

function handleChangeCustomFeedOrder(event: any) {
  // Handle feed order changes
  mainState.changeCustomFeedOrder(event.direction, event.item)
}
</script>

<template>
  <div class="feeds-view">
    <h1 class="feeds-view__title">{{ $t("feed") }}</h1>

    <!-- My Feeds Section -->
    <div class="feeds-view__section">
      <h2 class="feeds-view__section-title">{{ $t("myFeeds") }}</h2>
      <div class="feeds-view__feed-list" v-if="!state.isLoading && state.myFeeds.length > 0">
        <SpecialFeedCard 
          v-for="(item, index) in state.myFeeds" 
          :key="index"
          :item="item"
          @changeCustomFeedOrder="handleChangeCustomFeedOrder"
        />
      </div>
      <div class="feeds-view__empty" v-else-if="!state.isLoading">
        {{ $t("noFeeds") }}
      </div>
      <div class="feeds-view__loading" v-else>
        {{ $t("loading") }}
      </div>
    </div>

    <!-- All Feeds Section -->
    <div class="feeds-view__section">
      <h2 class="feeds-view__section-title">{{ $t("feeds") }}</h2>
      <div class="feeds-view__feed-list" v-if="!state.isLoading && state.popularFeeds.length > 0">
        <FeedCard
          v-for="(generator, index) in state.popularFeeds"
          :key="index"
          :generator="generator"
          :menuDisplay="true"
          :detailDisplay="true"
          :orderButtonDisplay="false"
          :creatorDisplay="true"
        />
      </div>
      <div class="feeds-view__empty" v-else-if="!state.isLoading">
        {{ $t("noFeeds") }}
      </div>
      <div class="feeds-view__loading" v-else>
        {{ $t("loading") }}
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.feeds-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;

  &__title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__section-title {
    font-size: 1.25rem;
    font-weight: 500;
  }

  &__feed-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__empty {
    color: var(--text-color-light);
    font-style: italic;
    padding: 1rem 0;
  }

  &__loading {
    color: var(--text-color-light);
    padding: 1rem 0;
  }
}
</style>
