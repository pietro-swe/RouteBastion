import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue, { type PrimeVueConfiguration } from 'primevue/config';

import 'primevue/resources/themes/aura-dark-blue/theme.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  ripple: true,
  inputVariant: "filled"
} as PrimeVueConfiguration)

app.mount('#app')
