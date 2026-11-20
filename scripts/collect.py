#!/usr/bin/env python3
"""Fetch recent Chicago building permits into a static JSON feed. No paid dependencies.

Only public project fields are retained. No applicant names/contact details are stored.
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import re
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

from permit_privacy import redact_contact_details

BASE = 'https://data.cityofchicago.org/resource/ydr8-5enu.json'
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'data' / 'permits.json'
FIELDS = 'id,permit_,permit_type,permit_status,issue_date,street_number,street_direction,street_name,work_type,work_description,reported_cost,ward,community_area'
TRADE_PATTERNS = [
    ('Roofing', r'roof|shingle|flashing'),
    ('HVAC', r'hvac|furnace|air condition|ventilat|ductwork|mechanical'),
    ('Plumbing', r'plumb|water heater|water service|sewer|drain'),
    ('Electrical', r'electrical|rewir|light fixture|power distribution|service panel'),
    ('Windows & Doors', r'window|door replacement|glaz'),
    ('Concrete', r'concrete|foundation|masonry|sidewalk'),
    ('Demolition', r'demolition|wrecking|remove existing building'),
    ('New Construction', r'new construction|new building|erect new|new residential'),
    ('Renovation', r'alteration|remodel|rehab|interior buildout|renovation'),
]


def classify(description: str, work_type: str, permit_type: str) -> str:
    text = ' '.join([work_type or '', description or '', permit_type or '']).lower()
    for name, pattern in TRADE_PATTERNS:
        if re.search(pattern, text):
            return name
    return 'Other'


def safe_cost(value) -> float | None:
    try:
        amount = float(value)
        return round(amount, 2) if 0 <= amount < 1_000_000_000_000 else None
    except (TypeError, ValueError):
        return None


def normalize(raw: dict) -> dict | None:
    ident = str(raw.get('permit_') or raw.get('id') or '').strip()
    issue = str(raw.get('issue_date') or '')[:10]
    if not ident or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', issue):
        return None
    work = redact_contact_details(str(raw.get('work_description') or '').strip())
    address = ' '.join(str(raw.get(k) or '').strip() for k in ('street_number', 'street_direction', 'street_name'))
    address = re.sub(r'\s+', ' ', address).strip()
    return {
        'id': ident,
        'issue_date': issue,
        'address': address,
        'permit_type': str(raw.get('permit_type') or 'Unspecified'),
        'work_type': str(raw.get('work_type') or ''),
        'description': work[:1200],
        'cost': safe_cost(raw.get('reported_cost')),
        'ward': str(raw.get('ward') or ''),
        'trade': classify(work, str(raw.get('work_type') or ''), str(raw.get('permit_type') or '')),
        'source': 'https://data.cityofchicago.org/Buildings/Building-Permits/ydr8-5enu',
    }


def fetch_json(url: str) -> list[dict]:
    for attempt in range(4):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'BuildPulseChicago/0.1 (public-data dashboard)', 'Accept': 'application/json'})
            with urllib.request.urlopen(request, timeout=35) as resp:
                payload = json.load(resp)
                if not isinstance(payload, list):
                    raise ValueError('Unexpected API payload: expected a JSON array')
                return payload
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            if attempt == 3:
                raise RuntimeError(f'Data download failed: {exc}') from exc
            time.sleep(2 ** attempt)
    raise RuntimeError('Unreachable retry state')


def collect(days: int = 30, limit: int = 8000) -> dict:
    now = dt.datetime.now(dt.timezone.utc)
    cutoff = (now - dt.timedelta(days=days)).date().isoformat()
    entries: dict[str,dict] = {}
    page = 1000
    for offset in range(0, limit, page):
        params = urllib.parse.urlencode({
            '$select': FIELDS,
            '$where': f"issue_date >= '{cutoff}T00:00:00'",
            '$order': 'issue_date DESC, permit_ DESC',
            '$limit': min(page, limit - offset),
            '$offset': offset,
        })
        batch = fetch_json(BASE + '?' + params)
        for raw in batch:
            item = normalize(raw)
            if item:
                entries[item['id']] = item
        if len(batch) < page:
            break
    else:
        raise RuntimeError(f'Hit {limit}-row safety cap. Increase --limit to avoid publishing a truncated feed.')
    if not entries:
        raise RuntimeError('Received zero valid permits. Refusing to replace existing data.')
    records = sorted(entries.values(), key=lambda x: (x['issue_date'], x['id']), reverse=True)
    return {
        'meta': {
            'mode': 'live',
            'source': 'City of Chicago Open Data — Building Permits (ydr8-5enu)',
            'source_url': 'https://data.cityofchicago.org/Buildings/Building-Permits/ydr8-5enu',
            'retrieved_at': now.isoformat(timespec='seconds'),
            'range_days': days,
            'row_count': len(records),
            'latest_issue_date': records[0]['issue_date'],
            'disclaimer': 'City records may be delayed or amended. Trade categories are heuristic. Reported costs are applicant-reported, not verified.'
        },
        'items': records
    }


def atomic_write(payload: dict, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=dest.parent, delete=False, suffix='.tmp') as tmp:
        json.dump(payload, tmp, ensure_ascii=False, separators=(',', ':'))
        path = Path(tmp.name)
    path.replace(dest)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--days', type=int, default=30)
    parser.add_argument('--limit', type=int, default=8000)
    parser.add_argument('--out', type=Path, default=OUT)
    args = parser.parse_args()
    if not 1 <= args.days <= 365 or not 1 <= args.limit <= 100_000:
        parser.error('Invalid days or limit')
    payload = collect(args.days, args.limit)
    atomic_write(payload, args.out)
    print(f"Saved {payload['meta']['row_count']} permits to {args.out}; newest {payload['meta']['latest_issue_date']}")


if __name__ == '__main__':
    main()
