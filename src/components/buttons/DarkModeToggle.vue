<script lang="ts" setup>
import { inject, computed } from "vue"
import SVGIcon from "@/components/images/SVGIcon.vue"

const mainState = inject("state") as MainState

const isDarkMode = computed(() => {
  const currentTheme = mainState.currentSetting.colorTheme
  return currentTheme === 'dark' || currentTheme === 'darkGray'
})

function toggleDarkMode() {
  // Toggle between light and dark themes while preserving gray preference
  const currentTheme = mainState.currentSetting.colorTheme
  let newTheme

  if (currentTheme === 'auto') {
    newTheme = 'light'
  } else if (currentTheme === 'light' || currentTheme === 'lightGray') {
    // If current is light or lightGray, switch to corresponding dark theme
    newTheme = currentTheme === 'lightGray' ? 'darkGray' : 'dark'
  } else {
    // If current is dark or darkGray, switch to corresponding light theme
    newTheme = currentTheme === 'darkGray' ? 'lightGray' : 'light'
  }

  mainState.currentSetting.colorTheme = newTheme
  mainState.saveSettings()
  mainState.updateSettings()
}
</script>

<template>
  <button 
    class="dark-mode-toggle" 
    @click="toggleDarkMode" 
    :title="$t(isDarkMode ? 'switchToLightMode' : 'switchToDarkMode')"
  >
    <SVGIcon :name="isDarkMode ? 'white-balance-sunny' : 'weather-night'" />
  </button>
</template>

<style lang="scss" scoped>
.dark-mode-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(var(--accent-color), 0.1);
  }
  
  :deep(svg) {
    width: 1.5rem;
    height: 1.5rem;
    fill: rgb(var(--fg-color));
  }
}
</style>
