#!/usr/bin/env python3
"""Recent Sussex County Delaware permit points (official county ArcGIS).

The county layer supplies individual issue dates; unlike Delaware's statewide
planning trend layer, this is daily-granularity data. County coverage only.
No names, contractors, owners, phones, emails or home contact information.
"""
from __future__ import annotations
import datetime as dt
from pathlib import Path
import json
import urllib.parse
import urllib.request
import sys
import time
sys.path.insert(0, str(Path(__file__).resolve().parent))
from collect import atomic_write, classify, safe_cost, ROOT
from collect_markets import date_string, get_json

BASE = "https://map.sussexcountyde.gov/trdserver/rest/services/Permit_Points/FeatureServer/0/query"
SOURCE = "https://map.sussexcountyde.gov/trdserver/rest/services/Permit_Points/FeatureServer/0"
OUT = ROOT / "public" / "data" / "sussex.json"

def collect(days: int = 45, limit: int = 15000):
    now = dt.datetime.now(dt.timezone.utc)
    cutoff = (now - dt.timedelta(days=days)).date().isoformat()
    results = {}
    page = 1000
    have_older = False
    for offset in range(0, limit, page):
        response = get_json(BASE, {
            "where": "1=1", "outFields": "OBJECTID,pt_a_permit_no,pt_p_issue_date,pt_a_type_desc,pt_a_permit_type,a_parcel_id,h_description1,h_description2,a_project_desc,a_use_desc,a_status",
            "returnGeometry": "false", "f": "json",
            "orderByFields": "pt_p_issue_date DESC, OBJECTID DESC",
            "resultOffset": offset, "resultRecordCount": page,
        })
        features = response.get("features")
        if not isinstance(features, list):
            raise RuntimeError("Sussex returned invalid feature response")
        for feature in features:
            row = feature.get("attributes", {})
            issued = date_string(row.get("pt_p_issue_date"))
            if not issued or issued < cutoff:
                have_older = True
                continue
            ident = str(row.get("pt_a_permit_no") or row.get("OBJECTID") or "").strip()
            if not ident or ident in results:
                continue
            desc = " ".join(filter(None, [
                str(row.get("h_description1") or "").strip(),
                str(row.get("h_description2") or "").strip(),
                str(row.get("a_project_desc") or "").strip(),
            ]))[:1200]
            kind = str(row.get("pt_a_type_desc") or row.get("pt_a_permit_type") or "")
            parcel = str(row.get("a_parcel_id") or "").strip()
            results[ident] = {
                "id": ident, "issue_date": issued, "date_precision": "day",
                "address": ("Parcel " + parcel + ", Sussex County, Delaware") if parcel else "Sussex County, Delaware",
                "description": desc, "permit_type": kind, "work_type": str(row.get("a_use_desc") or ""),
                "cost": None, "ward": "Sussex County",
                "trade": classify(desc, kind, str(row.get("a_use_desc") or "")),
                "source": SOURCE, "data_scope": "Sussex County only",
            }
        if have_older or len(features) < page:
            break
    else:
        raise RuntimeError("Sussex pagination exceeded cap; refusing truncated feed")
    if not results:
        raise RuntimeError("No recent Sussex permits; preserving existing feed")
    items = sorted(results.values(), key=lambda r:(r["issue_date"],r["id"]),reverse=True)
    payload = {"meta":{
        "mode":"live", "market":"delaware", "scope":"Sussex County only",
        "source":"Sussex County Permit Points (individual issue dates)",
        "source_url":SOURCE, "retrieved_at":now.isoformat(timespec="seconds"),
        "range_days":days, "row_count":len(items), "latest_issue_date":items[0]["issue_date"],
        "date_precision":"day",
        "disclaimer":"Recent Sussex County permits only. Excludes New Castle, Kent and incorporated municipalities not included by the county layer."
    }, "items":items}
    return payload

if __name__ == "__main__":
    payload=collect()
    atomic_write(payload,OUT)
    print("sussex: saved %s permits; newest %s" % (len(payload["items"]), payload["meta"]["latest_issue_date"]))
