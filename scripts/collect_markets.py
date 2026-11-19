#!/usr/bin/env python3
"""Fetch public construction permit records for D.C., Philadelphia, and Delaware.

Feeds are separate, so failure in one jurisdiction cannot overwrite another.
Delaware's statewide layer reports permit YEAR, not individual issue dates;
those records are explicitly marked as year-only historical indicators.
Only public project fields are retained (no owners or contact information).
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path
import time
import urllib.parse
import urllib.request

from collect import ROOT, atomic_write, classify, safe_cost

DATA = ROOT / "public" / "data"
DC = "https://maps2.dcgis.dc.gov/dcgis/rest/services/FEEDS/DCRA/FeatureServer/4"
DE = "https://enterprise.firstmap.delaware.gov/arcgis/rest/services/PlanningCadastre/DE_Planning_Development/FeatureServer/3"
PHL = "https://phl.carto.com/api/v2/sql"

SOURCES = {
    "dc": ("District of Columbia DOB — building permits, last 30 days",
           "https://opendata.dc.gov/datasets/DCGIS::building-permits-in-last-30-days"),
    "philadelphia": ("Philadelphia L&I building and zoning permits",
                     "https://data.phila.gov/visualizations/li-building-permits/"),
    "delaware": ("Delaware Office of State Planning Coordination — permit locations by year",
                 "https://stateplanning.delaware.gov/development-trends/index.shtml"),
}


def get_json(base: str, params: dict) -> dict:
    url = base + ("&" if "?" in base else "?") + urllib.parse.urlencode(params)
    error = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "BuildPulse/0.2 (construction market data, public gov APIs)",
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=45) as response:
                payload = json.load(response)
            if not isinstance(payload, dict) or "error" in payload:
                raise ValueError(f"API error: {str(payload.get('error', payload))[:350]}")
            return payload
        except (OSError, ValueError) as exc:
            error = exc
            if attempt < 2:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"{base} failed: {error}")


def date_string(v):
    if isinstance(v, (int, float)):
        return dt.datetime.fromtimestamp(v / 1000, tz=dt.timezone.utc).date().isoformat()
    if v:
        return str(v)[:10]
    return ""


def arcgis_rows(base, where, order, limit=5000):
    rows = []
    page = 1000
    for offset in range(0, limit, page):
        response = get_json(base + "/query", {
            "where": where,
            "outFields": "*",
            "returnGeometry": "false",
            "orderByFields": order,
            "resultOffset": offset,
            "resultRecordCount": min(page, limit - offset),
            "f": "json",
        })
        batch = [x.get("attributes", {}) for x in response.get("features", [])]
        if not isinstance(response.get("features"), list):
            raise RuntimeError("ArcGIS response missing features")
        rows.extend(batch)
        if len(batch) < page:
            return rows
    # A capped response would hide newer records or misrepresent coverage.
    raise RuntimeError(f"Reached ArcGIS {limit}-record cap; refusing to publish partial feed")


def fetch_dc(days=30):
    # Official D.C. layer itself covers only the last 30 days.
    rows = arcgis_rows(DC, "1=1", "ISSUE_DATE DESC", 9000)
    cutoff = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=min(days, 30))).date().isoformat()
    result = []
    seen = set()
    for raw in rows:
        ident = str(raw.get("PERMIT_ID") or "").strip()
        issued = date_string(raw.get("ISSUE_DATE"))
        if not ident or not issued or issued < cutoff or ident in seen:
            continue
        seen.add(ident)
        desc = str(raw.get("DESC_OF_WORK") or "")[:1200]
        typ = str(raw.get("PERMIT_TYPE_NAME") or "")
        subtype = str(raw.get("PERMIT_SUBTYPE_NAME") or "")
        result.append({
            "id": ident, "issue_date": issued, "address": str(raw.get("FULL_ADDRESS") or "").strip(),
            "description": desc, "permit_type": typ, "work_type": subtype,
            "trade": classify(desc, subtype, typ),
            "cost": safe_cost(raw.get("PERMIT_FEE")) if False else None,
            "ward": str(raw.get("WARD") or ""), "source": SOURCES["dc"][1],
            "date_precision": "day",
        })
    return result


def fetch_philadelphia(days=30):
    cutoff = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)).date().isoformat()
    result = []
    limit = 1000
    for offset in range(0, 8000, limit):
        q = (
            "SELECT permitnumber, permitissuedate, address, permittype, "
            "permitdescription, typeofwork, approvedscopeofwork, council_district "
            "FROM permits WHERE permitissuedate >= DATE '" + cutoff + "' "
            "ORDER BY permitissuedate DESC LIMIT " + str(limit) + " OFFSET " + str(offset)
        )
        response = get_json(PHL, {"q": q})
        batch = response.get("rows")
        if not isinstance(batch, list):
            raise RuntimeError("Philadelphia returned no rows array")
        for raw in batch:
            ident = str(raw.get("permitnumber") or "").strip()
            issued = date_string(raw.get("permitissuedate"))
            if not ident or not issued:
                continue
            desc = str(raw.get("approvedscopeofwork") or raw.get("permitdescription") or "")[:1200]
            typ = str(raw.get("permittype") or "")
            work = str(raw.get("typeofwork") or "")
            result.append({
                "id": ident, "issue_date": issued, "address": str(raw.get("address") or "").strip(),
                "description": desc, "permit_type": typ, "work_type": work,
                "trade": classify(desc, work, typ),
                "cost": None, "ward": str(raw.get("council_district") or ""),
                "source": SOURCES["philadelphia"][1], "date_precision": "day",
            })
        if len(batch) < limit:
            break
    return list({r["id"]: r for r in result}.values())


def fetch_delaware():
    # State-level data has no per-permit issue dates: this is annual historical
    # research, not a live construction lead feed. Include 2024 onward only.
    rows = arcgis_rows(DE, "P_YEAR >= '2024'", "P_YEAR DESC, OBJECTID DESC", 30000)
    result = []
    for raw in rows:
        ident = str(raw.get("OBJECTID") or "").strip()
        year = str(raw.get("P_YEAR") or "").strip()
        if not ident or not (len(year) == 4 and year.isdigit() and 2008 <= int(year) <= 2100):
            continue
        county = str(raw.get("COUNTY") or "").strip()
        jurisdiction = str(raw.get("JURISDICTION") or "").strip()
        notes = str(raw.get("NOTES") or "")[:400]
        residential = str(raw.get("R_NR") or "").strip()
        desc = " / ".join(filter(None, [notes, "Residential" if residential.upper().startswith("R") else "Nonresidential" if residential else ""]))
        result.append({
            "id": ident, "issue_date": year + "-01-01", "permit_year": year,
            "date_precision": "year", "address": ", ".join(filter(None, [jurisdiction, county])) + ", Delaware",
            "description": desc, "permit_type": str(raw.get("RECTYPE") or "Building permit location"),
            "work_type": residential, "trade": "Unclassified (yearly data)",
            "cost": None, "ward": county, "source": SOURCES["delaware"][1],
        })
    return result


def build(market, items):
    if not items:
        raise RuntimeError(f"{market}: no valid records returned, preserving prior file")
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    items.sort(key=lambda row: (row["issue_date"], row["id"]), reverse=True)
    name, source_url = SOURCES[market]
    return {
        "meta": {
            "mode": "live", "market": market, "source": name,
            "source_url": source_url, "retrieved_at": now,
            "row_count": len(items), "latest_issue_date": items[0]["issue_date"],
            "date_precision": "year" if market == "delaware" else "day",
            "disclaimer": (
                "Statewide building permits for new structures, reported by YEAR, not daily issues; not a live construction lead feed."
                if market == "delaware" else
                "Official public records may lag or be amended; trade categories are heuristic."
            ),
        }, "items": items,
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--days", type=int, default=30)
    p.add_argument("--market", choices=["dc", "philadelphia", "delaware", "all"], default="all")
    args = p.parse_args()
    tasks = {
        "dc": lambda: fetch_dc(args.days),
        "philadelphia": lambda: fetch_philadelphia(args.days),
        "delaware": fetch_delaware,
    }
    failed = []
    for market, collector in tasks.items():
        if args.market not in ("all", market):
            continue
        try:
            payload = build(market, collector())
            atomic_write(payload, DATA / (market + ".json"))
            print(f"{market}: saved {len(payload['items'])} records; newest {payload['meta']['latest_issue_date']}")
        except Exception as exc:
            print(f"{market}: ERROR: {exc}")
            failed.append(market)
    if failed:
        raise SystemExit("Could not update: " + ", ".join(failed))


if __name__ == "__main__":
    main()
