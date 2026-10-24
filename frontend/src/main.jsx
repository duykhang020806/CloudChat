import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import DisableDevtool from 'disable-devtool'
import './index.css'
import App from './App.jsx'

DisableDevtool({
  disableMenu: false, // Vẫn cho phép chuột phải để người dùng copy / paste
  disableSelect: false, // Cho phép bôi đen chọn chữ
  disableCopy: false, // Cho phép copy
  disablePaste: false, // Cho phép paste
  disableCut: false, // Cho phép cut
  clearLog: true,
  rewriteHTML:
    '<div id="devtools-guard" style="position: fixed; inset: 0px; display: flex; align-items: center; justify-content: center; font: 600 16px / 1.5 system-ui, -apple-system, \'Segoe UI\', Roboto; color: rgb(203, 213, 225); background: rgb(11, 18, 32); z-index: 99999999;">DevTools detected. Close DevTools and reload to continue.</div>',
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
