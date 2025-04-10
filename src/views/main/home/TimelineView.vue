<script lang="ts" setup>
import { inject } from "vue"
import FeedList from "@/components/lists/FeedList.vue"

const mainState = inject("state") as MainState
</script>

<template>
  <div class="timeline-container">
    <!-- Twitter-like section tabs at the top of the timeline -->
    <Portal to="home-view-header-bottom">
    </Portal>
  <FeedList
    class="timeline-view"
    type="timeline"
    :feeds="mainState.timelineFeeds"
    :hasLoadButton="true"
  />
  </div>
</template>

<style lang="scss" scoped>
.timeline-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.timeline-view {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}
</style>
