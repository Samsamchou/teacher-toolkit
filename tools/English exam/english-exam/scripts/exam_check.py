"""Validate normalized exam plan; structural evidence, never teacher acceptance."""
import argparse
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

BLOOM = {'記憶', '理解', '應用', '分析'}


def validate(data, release=False):
    errors = []
    if data.get('mode') not in {'listening', 'reading_writing'}:
        errors.append('Unsupported exam mode')
    items = data.get('items', [])
    by_id = {item['id']: item for item in items}
    if not items or len(by_id) != len(items):
        errors.append('Missing items or duplicate item IDs')
    totals = Counter()
    phonics = {}
    for item in items:
        iid = item['id']
        points = item.get('points', 0)
        if not isinstance(points, (int, float)) or not math.isfinite(points) or points <= 0:
            errors.append(f'{iid}: points must be positive finite number')
            points = 0
        level = item.get('bloom')
        if level not in BLOOM or not item.get('reason'):
            errors.append(f'{iid}: missing Bloom level/reason')
        totals[level] += points
        if not item.get('source') or item.get('source_status') not in {'verified_for_item', 'teacher_resolved'}:
            errors.append(f'{iid}: source not verified for this item')
        if item.get('supplementary') and not item.get('supplementary_approved'):
            errors.append(f'{iid}: supplementary scope not approved')
        if item.get('answer') is None:
            errors.append(f'{iid}: missing answer')
        if isinstance(item.get('options'), dict) and item.get('answer') not in item['options']:
            errors.append(f'{iid}: answer does not match option key')
        if item.get('phonics_target'):
            target = item['phonics_target'].strip().casefold()
            if target in phonics:
                errors.append(f'{iid}: repeated phonics target also in {phonics[target]}')
            phonics[target] = iid
    if not math.isclose(sum(totals.values()), data.get('total_points', -1), abs_tol=1e-6):
        errors.append('Total points mismatch')
    for level in BLOOM:
        if not math.isclose(totals[level], data.get('bloom_points', {}).get(level, 0), abs_tol=1e-6):
            errors.append(f'Bloom subtotal mismatch: {level}')
    events = data.get('events', [])
    if data.get('mode') == 'listening' and not events:
        errors.append('Listening plan requires events')
    if len({e['event_id'] for e in events}) != len(events):
        errors.append('Duplicate event IDs')
    groups = defaultdict(list)
    dialogue = defaultdict(lambda: defaultdict(list))
    for event in events:
        eid = event['event_id']
        iid = event.get('item_id')
        if iid is not None and iid not in by_id:
            errors.append(f'{eid}: unknown item ID')
        if event.get('kind') == 'silence':
            pause = event.get('pause_seconds', -1)
            if not isinstance(pause, (int, float)) or not math.isfinite(pause) or pause < 0:
                errors.append(f'{eid}: invalid silence')
            if event.get('text'):
                errors.append(f'{eid}: silence must not contain spoken text')
        elif event.get('kind') == 'speech':
            if not event.get('text') or not event.get('voice'):
                errors.append(f'{eid}: missing speech text/voice')
            if iid:
                groups[iid].append(event)
            if event.get('dialogue_id') and event.get('role') != 'narrator':
                dialogue[event['dialogue_id']][event.get('repeat', 1)].append(event)
        else:
            errors.append(f'{eid}: unknown event kind')
    for iid, item in by_id.items():
        if item.get('phonics_target') and data.get('mode') == 'listening':
            readings = [e for e in groups[iid] if e.get('role') == 'target']
            if len(readings) != item.get('expected_readings', 2):
                errors.append(f'{iid}: wrong phonics reading count')
            if any(e['text'].strip().rstrip('.').casefold() != item['phonics_target'].casefold() for e in readings):
                errors.append(f'{iid}: spoken target differs from paper plan')
            if item.get('male_then_female') and [e.get('voice_style') for e in readings] != ['male', 'female']:
                errors.append(f'{iid}: expected male then female')
    for did, repeats in dialogue.items():
        all_events = [e for group in repeats.values() for e in group]
        roles = defaultdict(set)
        for event in all_events:
            roles[event.get('role')].add(event['voice'])
        if len(roles) != 2 or any(len(v) != 1 for v in roles.values()) or len({e['voice'] for e in all_events}) != 2:
            errors.append(f'{did}: dialogue must have exactly two fixed role voices')
        sequences = [[(e.get('role'), e['voice'], e['text']) for e in group] for _, group in sorted(repeats.items())]
        if any(seq != sequences[0] for seq in sequences[1:]):
            errors.append(f'{did}: repeated dialogue differs')
        expected = data.get('dialogue_repeats', {}).get(did)
        if expected is None or len(repeats) != expected or sorted(repeats) != list(range(1, expected + 1)):
            errors.append(f'{did}: missing/incorrect declared dialogue repeat count')
    if release:
        required = ['spec', 'text', 'paper_visual_qa', 'teacher_paper']
        if data.get('mode') == 'listening':
            required += ['audio_technical_qa', 'audio_content_qa', 'teacher_audio']
        for gate in required:
            if data.get('approvals', {}).get(gate) is not True:
                errors.append(f'Release gate not passed: {gate}')
    return {'ok': not errors, 'item_count': len(items), 'event_count': len(events),
            'bloom_points': dict(totals), 'errors': errors,
            'scope': 'Structural plan checks only; does not independently verify semantics or approval authenticity'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('plan', type=Path)
    parser.add_argument('--release', action='store_true')
    args = parser.parse_args()
    try:
        result = validate(json.loads(args.plan.read_text(encoding='utf-8-sig')), args.release)
    except (ValueError, KeyError, TypeError, OSError) as exc:
        result = {'ok': False, 'errors': [str(exc)]}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result['ok'] else 1)
