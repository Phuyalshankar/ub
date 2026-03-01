import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // React प्रोजेक्टको लागि यो अनिवार्य छ
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    // १. ब्राउजर जस्तै इन्भाइरोन्मेन्ट बनाउन jsdom चाहिन्छ
    environment: 'jsdom',
    // २. ग्लोबल भेरिएबलहरू (describe, it, expect) सिधै प्रयोग गर्न
    globals: true,
    // ३. सेटअप फाइल (यदि तपाईँलाई थप कन्फिग चाहिन्छ भने)

  },
})