import React from 'react'
import { createRoot } from 'react-dom/client'
import 'specbook/styles/global.css'
import { SpecBookPage } from 'specbook/components'
import data from 'virtual:specbook-data'
createRoot(document.getElementById('root')!).render(<SpecBookPage data={data as any} />)
