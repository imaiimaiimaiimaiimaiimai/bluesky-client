<script lang="ts" setup>
import { computed, inject, reactive, type ComputedRef } from "vue"
import { RouterView } from "vue-router"
import PageHeader from "@/components/shells/PageHeader.vue"
import PageHeaderButtons from "@/components/shells/PageHeaderButtons.vue"

const mainState = inject("state") as MainState

const state = reactive<{
  postQuery: ComputedRef<string>
  query: ComputedRef<string>
}>({
  postQuery: computed((): string => {
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
  query: computed((): string => {
    return mainState.currentSearchTerm
      ? `?text=${mainState.currentSearchTerm}`
      : ""
  }),
})
</script>

<template>
  <div class="search-view">
    <Portal to="router-view-wrapper-header">
      <PageHeader
        :hasBackButton="true"
        :title="$t('search')"
      >
        <template #right>
          <PageHeaderButtons />
        </template>
      </PageHeader>
      <div class="card">
        <div class="tab">
          <!-- Post search page -->
          <RouterLink
            class="tab__button"
            :to="`/search/post${state.postQuery}`"
          >
            Posts
          </RouterLink>

          <!-- Feed search page -->
          <RouterLink
            class="tab__button"
            :to="`/search/feed${state.query}`"
          >
            Feeds
          </RouterLink>

          <!-- User search page -->
          <RouterLink
            class="tab__button"
            :to="`/search/user${state.query}`"
          >
            Users
          </RouterLink>
        </div>
        <div class="search-view__form">
          <PortalTarget name="search-view-header" />
        </div>
      </div>
    </Portal>
    <RouterView class="child-view" />
  </div>
</template>

<style lang="scss" scoped>
.search-view {
  display: flex;
  flex-direction: column;
  flex-grow: 1;

  &__form {
    display: flex;
    flex-direction: column;
    grid-gap: 0.5rem;
    &:empty {
      display: none;
    }

    &:deep() {
      .group-parts > *:first-child {
        flex-grow: 1;
      }

      .svg-icon--history,
      .svg-icon--setting {
        font-size: 1.25rem;
      }
    }
  }
}

.child-view {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.card {
  background-color: rgb(var(--bg-color));
  border-radius: var(--border-radius-middle);
  padding: 0.75rem;
  margin: 0.5rem;
  box-shadow: var(--card-shadow);
}

.tab {
  display: flex;
  justify-content: space-around;
  margin-bottom: 0.75rem;
}

.tab__button {
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius-small);
  text-decoration: none;
  color: rgb(var(--fg-color), 0.7);
  font-weight: bold;

  &:hover {
    background-color: rgb(var(--fg-color), 0.1);
  }

  &.router-link-exact-active {
    color: rgb(var(--accent-color));
    background-color: rgb(var(--accent-color), 0.1);
  }
}
</style>
