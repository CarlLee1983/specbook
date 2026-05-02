import { hydrateRoot } from 'react-dom/client'
import { SpecBookPage } from '../components/SpecBookPage.js'
import { mountScrollspy } from './scrollspy.js'
import type { SpecBookData } from '../content/load-all.js'
import '../styles/global.css'

const root = document.getElementById('root')!
const stateEl = document.getElementById('__specbook_state')
if (stateEl) {
  const data = JSON.parse(stateEl.textContent ?? '{}') as SpecBookData
  hydrateRoot(root, <SpecBookPage data={data} />)
}

mountScrollspy()
