import CryptoJS from 'crypto-js'

const SECRET = 'orbitdesk-secret-key'

export function secureSet<T>(key: string, value: T): void {
  const json = JSON.stringify(value)
  const encrypted = CryptoJS.AES.encrypt(json, SECRET).toString()
  localStorage.setItem(key, encrypted)
}

export function secureGet<T>(key: string): T | null {
  const encrypted = localStorage.getItem(key)
  if (!encrypted) return null
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET)
    const json = bytes.toString(CryptoJS.enc.Utf8)
    if (!json) return null
    return JSON.parse(json) as T
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

export function secureRemove(key: string): void {
  localStorage.removeItem(key)
}
