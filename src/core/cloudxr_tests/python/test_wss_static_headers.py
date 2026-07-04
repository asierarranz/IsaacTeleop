# SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

"""Caching headers for the hosted web client (``--host-client``).

The client is served from fixed URLs with no content hash, so without
``Cache-Control`` the browser's heuristic cache can keep serving a stale
``index.html``/``bundle.js`` long after a new client has been deployed.
These tests pin the revalidation contract: ``no-cache`` + strong ``ETag``,
with a 304 short-circuit so revalidation does not re-download the bundle.
"""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest
from cloudxr_py_test_ns.wss import _make_http_handler
from websockets.datastructures import Headers


class _FakeRequest:
    def __init__(self, path: str, headers: dict[str, str] | None = None) -> None:
        self.path = path
        self.headers = Headers(**(headers or {}))


def _serve(static_dir: Path, path: str, headers: dict[str, str] | None = None):
    handler = _make_http_handler("localhost", 49100, static_dir=static_dir)
    return asyncio.run(handler(None, _FakeRequest(path, headers)))


@pytest.fixture()
def static_dir(tmp_path: Path) -> Path:
    (tmp_path / "index.html").write_text("<html>client</html>", encoding="utf-8")
    (tmp_path / "bundle.js").write_text("console.log('client');", encoding="utf-8")
    return tmp_path


def test_client_html_is_served_with_no_cache_and_etag(static_dir: Path) -> None:
    response = _serve(static_dir, "/client/")
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-cache"
    assert response.headers["ETag"].startswith('"')


def test_client_bundle_revalidation_returns_304(static_dir: Path) -> None:
    first = _serve(static_dir, "/client/bundle.js")
    assert first.status_code == 200
    etag = first.headers["ETag"]

    revalidated = _serve(static_dir, "/client/bundle.js", {"If-None-Match": etag})
    assert revalidated.status_code == 304
    assert revalidated.body == b""
    assert revalidated.headers["ETag"] == etag


def test_client_etag_changes_when_content_changes(static_dir: Path) -> None:
    etag_before = _serve(static_dir, "/client/bundle.js").headers["ETag"]
    (static_dir / "bundle.js").write_text("console.log('updated');", encoding="utf-8")

    stale = _serve(static_dir, "/client/bundle.js", {"If-None-Match": etag_before})
    assert stale.status_code == 200
    assert stale.headers["ETag"] != etag_before
