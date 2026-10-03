import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { compactRuns, formatRuns, studentSize } from './slide-canvas.mjs';

export function SlideRuns({ element, student = false }) {
  return (element.runs || []).map((run, i) => <span key={i} style={{ color: run.color, fontWeight: run.bold === undefined ? undefined : run.bold ? 700 : 400, fontSize: run.size === undefined ? undefined : student ? studentSize(run.size) : run.size }}>{run.text}</span>);
}
function offsets(root) {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null;
  const range = selection.getRangeAt(0), before = range.cloneRange(); before.selectNodeContents(root); before.setEnd(range.startContainer, range.startOffset);
  return { start: before.toString().length, end: before.toString().length + range.toString().length };
}
function selectOffsets(root, { start, end }) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  if (!nodes.length) { root.append(document.createTextNode('')); nodes.push(root.lastChild); }
  function point(at) { for (const node of nodes) { if (at <= node.length) return [node, at]; at -= node.length; } const last = nodes.at(-1); return [last, last.length]; }
  const range = document.createRange(); range.setStart(...point(start)); range.setEnd(...point(end));
  const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
}
function hexColor(value) {
  if (/^#[\da-f]{6}$/i.test(value)) return value;
  const rgb = value.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  return rgb ? '#' + rgb.slice(1).map(n => Number(n).toString(16).padStart(2, '0')).join('') : undefined;
}
function readRuns(root) {
  const runs = [];
  function walk(node, style = {}) {
    if (node.nodeType === Node.TEXT_NODE) { if (node.textContent) runs.push({ ...style, text: node.textContent }); return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === 'BR') { runs.push({ ...style, text: '\n' }); return; }
    const blockLine = node !== root && ['DIV', 'P'].includes(node.tagName);
    if (blockLine && runs.length && !runs.at(-1).text.endsWith('\n')) runs.push({ ...style, text: '\n' });
    const next = { ...style };
    if (node !== root) {
      const color = hexColor(node.style.color); if (color) next.color = color;
      if (node.style.fontWeight) next.bold = node.style.fontWeight === 'bold' || Number(node.style.fontWeight) >= 600;
      if (node.style.fontSize) next.size = Math.max(12, Math.min(100, parseFloat(node.style.fontSize)));
      if (['B', 'STRONG'].includes(node.tagName)) next.bold = true;
    }
    for (const child of node.childNodes) walk(child, next);
    if (blockLine && node.nextSibling && !runs.at(-1)?.text.endsWith('\n')) runs.push({ ...next, text: '\n' });
  }
  walk(root); return compactRuns(runs);
}
function writeRuns(host, runs) {
  const fragment = document.createDocumentFragment();
  for (const run of runs || []) {
    const span = document.createElement('span'); span.textContent = run.text;
    if (run.color) span.style.color = run.color;
    if (run.bold !== undefined) span.style.fontWeight = run.bold ? '700' : '400';
    if (run.size !== undefined) span.style.fontSize = `${run.size}px`;
    fragment.append(span);
  }
  host.replaceChildren(fragment);
}
export const SlideTextEditor = forwardRef(function SlideTextEditor({ element, onChange, onSelection, autofocus = false }, exposed) {
  const root = useRef(null), selection = useRef(null), pending = useRef(null), latest = useRef(element), composing = useRef(false);
  latest.current = element;
  useEffect(() => {
    const capture = () => {
      const value = offsets(root.current); if (!value) return; selection.current = value;
      let at = 0, chosen = {};
      for (const run of readRuns(root.current)) { chosen = run; if (value.start < at + run.text.length) break; at += run.text.length; }
      onSelection?.({ size: chosen.size ?? latest.current.size, color: chosen.color ?? latest.current.color, bold: chosen.bold ?? !!latest.current.bold });
    };
    document.addEventListener('selectionchange', capture);
    if (autofocus) { root.current.focus(); selectOffsets(root.current, { start: 0, end: 0 }); }
    return () => document.removeEventListener('selectionchange', capture);
  }, []);
  useLayoutEffect(() => {
    if (composing.current) return;
    const host = root.current, caret = pending.current || offsets(host);
    writeRuns(host, element.runs);
    if (caret) { if (pending.current) host.focus({ preventScroll: true }); selectOffsets(host, caret); selection.current = caret; }
    pending.current = null;
  }, [element.runs]);
  function change(values) {
    const current = latest.current, host = root.current, probe = host.cloneNode(false);
    probe.removeAttribute('role'); probe.removeAttribute('aria-label'); probe.contentEditable = 'false'; probe.setAttribute('aria-hidden', 'true');
    Object.assign(probe.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: 'auto', minHeight: '0', visibility: 'hidden', pointerEvents: 'none', fontSize: `${values.size ?? current.size}px` });
    writeRuns(probe, values.runs || current.runs);
    if (probe.textContent.endsWith('\n')) probe.append(document.createTextNode('\u200b'));
    host.parentElement.append(probe);
    const needed = Math.ceil((probe.scrollHeight + 4) / 720 * 100);
    probe.remove();
    // Growing is part of the same edit, so undo restores text and size together.
    onChange({ ...values, h: Math.min(100 - current.y, Math.max(current.h, needed)) });
  }
  function commit() {
    if (composing.current) return;
    selection.current = offsets(root.current); change({ runs: readRuns(root.current) });
  }
  function insert(text) {
    const host = root.current, value = offsets(host) || { start: host.textContent.length, end: host.textContent.length };
    selectOffsets(host, value);
    const range = window.getSelection().getRangeAt(0), node = document.createTextNode(text); range.deleteContents(); range.insertNode(node); range.setStartAfter(node); range.collapse(true);
    const selected = window.getSelection(); selected.removeAllRanges(); selected.addRange(range); commit();
  }
  useImperativeHandle(exposed, () => ({
    format(style) {
      const runs = readRuns(root.current), length = runs.reduce((n, r) => n + r.text.length, 0), range = offsets(root.current) || selection.current;
      const hasSelection = range && range.end > range.start;
      const from = hasSelection ? range.start : 0, to = hasSelection ? range.end : length;
      pending.current = range;
      change({ ...(hasSelection ? {} : style), runs: formatRuns(runs, from, to, style) });
    },
    toggleBold() {
      const runs = readRuns(root.current), range = offsets(root.current) || selection.current;
      let at = 0, current = latest.current.bold || false;
      for (const run of runs) { if (!range || range.start < at + run.text.length) { current = run.bold ?? current; break; } at += run.text.length; }
      this.format({ bold: !current });
    },
  }));
  return <div ref={root} className="sc-editable" role="textbox" aria-label="畫布文字" aria-multiline="true" contentEditable suppressContentEditableWarning data-placeholder="輸入文字…" spellCheck={false}
    onInput={commit} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; commit(); }}
    onPaste={e => { e.preventDefault(); e.stopPropagation(); insert(e.clipboardData.getData('text/plain')); }}
    onKeyDown={e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); insert('\n'); } if (e.key === 'Tab') e.stopPropagation(); }} />;
});
