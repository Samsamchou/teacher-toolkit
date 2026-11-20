import bank from '../../functions/routines-content.json'

export type StationMode = 'drag' | 'speak'
export interface Station {
  id: string; order: number; country: string; transport: 'home' | 'ship' | 'plane' | 'train'
  routine: string; question: string; code: string; hour: number; minute: number
  display: string; spoken: string; extended: string[]; mode: StationMode; puzzle: string; game: string
  drag?: { slots: string[]; distractors: string[] }
}
export const STATIONS = bank.stations as Station[]
export const ASSET = '/world-routines'
export type Hero = 'girl' | 'boy'
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
