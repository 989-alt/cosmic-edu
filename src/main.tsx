import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode 는 개발 모드에서 effect 를 두 번 실행한다. @react-three/fiber 9 는 첫 언마운트 때
// 500ms 뒤 같은 캔버스의 WebGL 컨텍스트를 forceContextLoss 하므로, 재마운트된 장면이
// "THREE.WebGLRenderer: Context Lost." 로 하얗게 죽는다(개발 서버에서만 재현). 그래서 뺐다.
createRoot(document.getElementById('root')!).render(<App />)
