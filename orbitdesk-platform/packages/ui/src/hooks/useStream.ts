import { useState, useEffect, useRef } from 'react'

interface UseStreamOptions {
  url: string
  token: string | null
  enabled?: boolean
}

interface UseStreamResult {
  text: string
  done: boolean
  error: string | null
}

// SSE streaming hook — used by mfe-chat for AI response streaming
export function useStream({ url, token, enabled = true }: UseStreamOptions): UseStreamResult {
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!enabled || !token) return

    setText('')
    setDone(false)
    setError(null)

    const es = new EventSource(`${url}?token=${encodeURIComponent(token)}`)
    esRef.current = es

    es.onmessage = (e) => {
      if (e.data === '[DONE]') {
        setDone(true)
        es.close()
        return
      }
      setText((prev) => prev + e.data)
    }

    es.onerror = () => {
      setError('Stream connection failed')
      setDone(true)
      es.close()
    }

    return () => {
      es.close()
    }
  }, [url, token, enabled])

  return { text, done, error }
}
