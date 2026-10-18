import csv
import io
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.auth import CurrentUser, require_admin
from app.supabase_client import get_service_client

router = APIRouter(prefix="/export", tags=["export"])

ExportEntity = Literal[
    "properties",
    "property_owner_details",
    "buyers",
    "buyer_property_viewings",
    "profiles",
    "tasks",
    "financial_transactions",
    "candidates",
]

PAGE_SIZE = 1000


def fetch_all_rows(table: str) -> list[dict]:
    client = get_service_client()
    rows: list[dict] = []
    start = 0
    while True:
        page = client.table(table).select("*").range(start, start + PAGE_SIZE - 1).execute().data
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            return rows
        start += PAGE_SIZE


@router.get("/{entity}")
def export_csv(entity: ExportEntity, _: CurrentUser = Depends(require_admin)) -> StreamingResponse:
    rows = fetch_all_rows(entity)

    buffer = io.StringIO()
    # BOM so Excel opens Hebrew text correctly.
    buffer.write("﻿")
    if rows:
        writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    buffer.seek(0)

    filename = f"{entity}_{date.today().isoformat()}.csv"
    return StreamingResponse(
        buffer,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
