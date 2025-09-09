// components/StripeUI.jsx
'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createLink } from '@/app/actions/test-actions'

export default function StripeUI() {
  const [title, setTitle] = useState('Custom Order')
  const [bullets, setBullets] = useState('- item 1\n- item 2')
  const [amount, setAmount] = useState('25.00')
  const [tip, setTip] = useState('0.00')
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (link) console.log('Payment Link (state):', link)
  }, [link])

  async function handleCreateLink() {
    setLoading(true); setError(''); setLink('')

    try {
      const description = bullets
        .split('\n')
        .map(s => s.replace(/^\s*[-*]\s?/, '• '))
        .join('\n')

      const { url } = await createLink({
        title,
        description,
        amount: Number(amount),
        tip: Number(tip),
      })

      console.log('Payment Link:', url)

      setLink(url)
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to create link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 border rounded-md p-4 max-w-xl">
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title shown on Stripe" />
      <textarea
        rows={6}
        className="border rounded p-2"
        value={bullets}
        onChange={e => setBullets(e.target.value)}
        placeholder="- bullet 1\n- bullet 2"
      />
      <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Subtotal (USD)" />
      <Input type="number" step="0.01" value={tip} onChange={e => setTip(e.target.value)} placeholder="Tip (USD)" />

      <Button onClick={handleCreateLink} disabled={loading}>
        {loading ? 'Creating…' : 'Generate Payment Link'}
      </Button>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {link && (
        <p className="text-sm">
          Payment Link:&nbsp;
          <a className="underline" href={link} target="_blank" rel="noreferrer">{link}</a>
        </p>
      )}
    </div>
  )
}
