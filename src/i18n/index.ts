import { zhTW } from './zh-TW.js'
import { en } from './en.js'
import type { Locale } from '../types.js'
export type { Strings } from './zh-TW.js'

export function getStrings(locale: Locale) {
  return locale === 'en' ? en : zhTW
}
