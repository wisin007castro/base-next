'use client'
import { FiThumbsDown, FiThumbsUp } from 'react-icons/fi'
import { useVotar } from '@/lib/hooks/blog.hooks'
import type { VotoValor } from '@/lib/types/blog.types'

interface Props {
  postId: number
  puntaje: number
  miVoto: VotoValor
  size?: 'sm' | 'md'
}

/** A favor / en contra. Pulsar el voto activo lo quita. Optimista: no espera a la API. */
export function VoteButtons({ postId, puntaje, miVoto, size = 'md' }: Props) {
  const votar = useVotar(postId)
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const btn = `rounded-md transition-colors ${size === 'sm' ? 'p-1' : 'p-1.5'}`

  const toggle = (valor: Exclude<VotoValor, 0>) => votar.mutate(miVoto === valor ? 0 : valor)

  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label="Votar publicación">
      <button
        type="button"
        onClick={() => toggle(1)}
        aria-pressed={miVoto === 1}
        title="A favor"
        className={`${btn} ${miVoto === 1 ? 'bg-[var(--ok-bg)] text-ok' : 'text-ink-3 hover:bg-[var(--line-1)] hover:text-ok'}`}
      >
        <FiThumbsUp className={icon} />
      </button>
      <span
        aria-live="polite"
        className={`min-w-6 text-center text-sm font-semibold tabular-nums ${puntaje > 0 ? 'text-ok' : puntaje < 0 ? 'text-risk' : 'text-ink-3'}`}
      >
        {puntaje}
      </span>
      <button
        type="button"
        onClick={() => toggle(-1)}
        aria-pressed={miVoto === -1}
        title="En contra"
        className={`${btn} ${miVoto === -1 ? 'bg-[var(--risk-bg)] text-risk' : 'text-ink-3 hover:bg-[var(--line-1)] hover:text-risk'}`}
      >
        <FiThumbsDown className={icon} />
      </button>
    </div>
  )
}
