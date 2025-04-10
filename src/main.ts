// Sass
import "@/scss/main.scss"

import { createApp } from "vue"
import App from "@/App.vue"
import { registerPlugins } from "@/plugins"

const app = createApp(App)

// Register plugins
registerPlugins(app)

// Mount the application
app.mount("#app")
