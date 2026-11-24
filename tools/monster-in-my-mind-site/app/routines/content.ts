import bank from '../../functions/routines-content.json'
import hsBank from '../../functions/routines-hs-content.json'

export type StationMode = 'drag' | 'speak'
export interface Station {
  id: string; order: number; country: string; transport: 'home' | 'ship' | 'plane' | 'train'
  routine: string; question: string; code: string; hour: number; minute: number
  display: string; spoken: string; extended: string[]; mode: StationMode; puzzle: string; game: string
  drag?: { slots: string[]; distractors: string[] }
  name?: string; pronoun?: string
}
export const STATIONS = bank.stations as Station[]
export const ASSET = '/world-routines'
export type Hero = 'girl' | 'boy'

// Two trips on the same pages: 'i' = /world-routines ("What time do you …?"), 'hs' = /world-routines-he-she
// (2026-11-24, "This is Mei. What time does she …?": the pupil is a world reporter). Each has its own bank, voice lines,
// story videos, flight clips, game settings and progress; shared art, cards, music and games.
export type Variant = 'i' | 'hs'
export interface Trip {
  variant: Variant; stations: Station[]; page: string; teacher: string; audio: string; video: string
  store: string; gamePrefix: string; clip: (name: string) => string; grammar?: string
}
export const TRIPS: Record<Variant, Trip> = {
  i: { variant: 'i', stations: STATIONS, page: '/world-routines', teacher: '/world-routines/teacher', audio: `${ASSET}/audio`, video: `${ASSET}/video`,
    store: 'wr', gamePrefix: '', clip: name => `${ASSET}/video/map_${name}.mp4` },
  hs: { variant: 'hs', stations: hsBank.stations as Station[], page: '/world-routines-he-she', teacher: '/world-routines-he-she/teacher',
    audio: `${ASSET}/audio/hs`, video: `${ASSET}/video/hs`, store: 'wrhs', gamePrefix: 'hs_',
    clip: name => name === 'opening' ? `${ASSET}/video/map_opening.mp4` : `${ASSET}/video/hs/map_${name}.mp4`,
    grammar: `${ASSET}/video/hs/grammar.mp4` },
}
// Cloud calls: the original trip sends exactly what it sent before; the he/she trip adds variant 'hs'.
export const tripData = (trip: Trip, data?: Record<string, unknown>) => trip.variant === 'i' ? data : { ...(data ?? {}), variant: trip.variant }
// Stations whose local pupil already has a tabletop 3D figure; the others still use the 2D drawing.
const CHAR_3D = new Set(['taiwan', 'japan'])
export const charSrc = (id: string) => CHAR_3D.has(id) ? `${ASSET}/art3d/char_${id}.png` : `${ASSET}/art/chars/${id}.png`

// Pin positions on art/world_map.jpg, in percent of width / height.
export const MAP_POS: Record<string, [number, number]> = {
  taiwan: [82.2, 43.1], japan: [87.6, 34.7], usa: [19.5, 34.7], uk: [43.5, 26], spain: [43.5, 35.5],
  egypt: [55.5, 40.7], kenya: [57.6, 55.6], india: [69.3, 46.3], singapore: [78.3, 55.3], australia: [80.4, 74.6],
}
// World clock easter egg: local time when it is 7:00 a.m. in Taiwan (standard time).
export const WORLD_CLOCK: Record<string, string> = {
  taiwan: '7:00 a.m.', japan: '8:00 a.m.', usa: '3:00 p.m. (yesterday)', uk: '11:00 p.m. (yesterday)', spain: '12:00 midnight',
  egypt: '1:00 a.m.', kenya: '2:00 a.m.', india: '4:30 a.m.', singapore: '7:00 a.m.', australia: '7:00 a.m.',
}
// "What time do you have breakfast?" with the three draggable words blanked out, in order.
export function questionParts(station: Station): Array<{ text: string } | { blank: number }> {
  const slots = station.drag?.slots ?? []
  const words = station.question.replace('?', ' ?').split(' ')
  let next = 0
  return words.map((word, index) => {
    const auxiliary = word === 'do' && words[index + 1] === 'you' // "do you" stays; the routine verb is the blank
    if (!auxiliary && next < slots.length && word.toLowerCase() === slots[next].toLowerCase()) return { blank: next++ }
    return { text: word }
  })
}
export function shuffled<T>(items: T[], seed: number): T[] {
  const list = [...items]
  let state = seed || 1
  for (let i = list.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    const j = state % (i + 1);[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}
