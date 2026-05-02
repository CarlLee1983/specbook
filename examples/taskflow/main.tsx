import React from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/styles/global.css'
import { SpecBookPage } from '../../src/components/SpecBookPage.js'
import { examplesData } from '../../src/dev/dev-data-stub.js'

const root = createRoot(document.getElementById('root')!)
root.render(<SpecBookPage data={examplesData} />)
