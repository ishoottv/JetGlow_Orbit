import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Auto dark mode based on OS preference
function applyColorScheme(e) {
  document.documentElement.classList.toggle('dark', e.matches);
}
const mq = window.matchMedia('(prefers-color-scheme: dark)');
applyColorScheme(mq);
mq.addEventListener('change', applyColorScheme);

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)