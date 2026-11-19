#!/usr/bin/env python3
"""Recent Sussex County Delaware permit points (official county ArcGIS).

The county layer supplies individual issue dates; unlike Delaware's statewide
planning trend layer, this is daily-granularity data. County coverage only.
No names, contractors, owners, phones, emails or home contact information.
"""
from __future__ import annotations
import datetime as dt
from collect import ROOT, atomic_write, classify
from collect_markets import arcgis_rows, date_string

SOURCE = "https://map.sussexcountyde.gov/trdserver/rest/services/Permit_Points/FeatureServer/0"
OUT = ROOT / "public" / "data" / "sussex.json"

def collect(days: int = 45, limit: int = 15000):
    now = dt.datetime.now(dt.timezone.utc)
    cutoff = (now - dt.timedelta(days=days)).date().isoformat()
    latest_allowed = (now + dt.timedelta(days=1)).date().isoformat()
    results = {}
    fields = ("OBJECTID,pt_a_permit_no,pt_p_issue_date,pt_a_type_desc,pt_a_permit_type,"
              "a_parcel_id,h_description1,h_description2,a_project_desc,a_use_desc")
    rows = arcgis_rows(
        SOURCE, "1=1", "pt_p_issue_date DESC, OBJECTID DESC", limit, fields=fields,
    )
    for row in rows:
        issued = date_string(row.get("pt_p_issue_date"))
        if not issued or issued > latest_allowed:
            continue
        if issued < cutoff:
            break
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
