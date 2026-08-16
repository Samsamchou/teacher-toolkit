import type { Metadata } from 'next'
import MonsterApp from './MonsterApp'

export const metadata: Metadata = {
  title: 'Monster in My Mind | Create Your Worry Monster',
  description: 'An English, SEL, art, and AI prompt activity for Taiwanese upper elementary students.',
}

export default function Home() {
  return <MonsterApp />
}
