"""Bounded offset pagination for public permit APIs."""

from collections.abc import Callable, Iterator
from typing import Any

Row = dict[str, Any]
FetchPage = Callable[[int, int], tuple[list[Row], bool]]


def iter_rows(fetch_page: FetchPage, *, limit: int, page_size: int = 1000) -> Iterator[Row]:
    """Yield rows until the source is exhausted, rejecting an unverified partial feed.

    Adapters return (rows, has_more). An extra one-row request distinguishes an
    exactly-full feed from a truncated feed when the API cannot say in advance.
    """
    if limit < 1 or page_size < 1:
        raise ValueError("Pagination limits must be positive")
    offset = 0
    while True:
        size = min(page_size, limit - offset) if offset < limit else 1
        rows, has_more = fetch_page(offset, size)
        if (not isinstance(rows, list) or len(rows) > size
                or any(not isinstance(row, dict) for row in rows)):
            raise RuntimeError("Invalid permit page")
        if not rows and has_more:
            raise RuntimeError("Permit API advertised more rows without making progress")
        if offset == limit and rows:
            raise RuntimeError(f"Exceeded {limit}-row safety cap; refusing a partial feed")
        yield from rows
        if not has_more:
            return
        offset += len(rows)
