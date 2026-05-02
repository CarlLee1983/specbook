import React from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/styles/global.css'
import { SpecBookPage } from '../../src/components/SpecBookPage.js'
import data from 'virtual:specbook-data'

const root = createRoot(document.getElementById('root')!)
root.render(<SpecBookPage data={data as any} />)
