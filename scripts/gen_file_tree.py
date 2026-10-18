#!/usr/bin/env python3
"""
Regenerates the annotated file tree block in docs/FILE_STRUCTURE.md.
Extracts tracked files using `git ls-files` (up to ~3 levels deep) and replaces
content between <!-- tree:start --> and <!-- tree:end --> markers.

Usage:
    python scripts/gen_file_tree.py
"""

import os
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

ANNOTATIONS = {
    ".github": "GitHub Actions CI/CD workflows and automated maintenance jobs",
    ".github/workflows": "Automated workflows (e.g. keep_alive.yml pinging backend on Render)",
    "Power BI": "Power BI dashboard reports and battle data modeling artifacts",
    "backend": "FastAPI application backend, SQLAlchemy models, and Alembic migrations",
    "backend/migrations": "Alembic schema migrations (0001_baseline, 0002_world, 0003_item_effects)",
    "backend/models": "Modular SQLAlchemy ORM definitions (models/__init__.py, world.py, evolution.py)",
    "backend/routers": "Modular FastAPI endpoint routers (compendium, encounters, evolutions, etc.)",
    "docs": "Architecture documentation, system design specifications, and file hierarchy guides",
    "frontend": "React 19 + TypeScript + Vite + Tailwind CSS frontend application",
    "frontend/public": "Static assets (PWA icons, favicon, web app manifest)",
    "frontend/src": "React application source code (components, context, pages, api hooks)",
    "frontend/src/api": "API client, TanStack Query options, and OpenAPI generated TypeScript types",
    "frontend/src/components": "UI components (Compendium, Builder, Navigation, Sheet modals)",
    "frontend/src/context": "React context providers (AuthContext, TeamContext, VersionContext, VisualQualityContext)",
    "frontend/src/pages": "Route views (Builder, Pokedex, Analysis, Analytics, Community, Leaderboard)",
    "frontend/tests": "Frontend unit, component, and accessibility test suites (Vitest + MSW)",
    "frontend/tests/e2e": "Playwright end-to-end integration and Axe accessibility test suites",
    "frontend/tests/fixtures": "MSW mock API response payloads for unit and component testing",
    "scripts": "Database seeding, CSV ingestion pipelines, and OpenAPI export utilities",
    "tests": "Backend regression and integration test suites (pytest + FastAPI TestClient)",
    "tests/fixtures": "Isolated CSV fixtures for testing data ingestion and schema migrations",
}

FILE_ANNOTATIONS = {
    "Procfile": "Deployment declaration for Render / PaaS web service execution",
    "render.yaml": "Render blueprint declaring API web service, build/start commands, and environment",
    "ARCHITECTURE.md": "High-level architectural overview linking to detailed system design docs",
    "README.md": "Primary project encyclopedia, quickstart guide, endpoint listing, and verification",
    ".gitignore": "Exclusion rules for local environments, build artifacts, and databases",
    "backend/alembic.ini": "Alembic migration configuration pointing to backend/migrations",
    "backend/auth.py": "Google OAuth 2.0 flow and JWT/session management endpoints",
    "backend/database.py": "SQLAlchemy engine setup, SessionLocal provider, and get_db dependency",
    "backend/http_cache.py": "Weak ETag generation, Cache-Control headers, and 304 Not Modified middleware",
    "backend/main.py": "FastAPI application entry point, CORS config, and root routes",
    "backend/ml_recommender.py": "Machine learning recommendation heuristic engine for team composition",
    "backend/requirements-dev.txt": "Pinned development and testing dependencies (pytest, httpx, ruff)",
    "backend/requirements.txt": "Pinned production dependencies (FastAPI, SQLAlchemy, uvicorn, etc.)",
    "backend/schemas.py": "Pydantic models for request validation and response serialization",
    "backend/start.py": "Production boot script running Alembic migrations before starting Uvicorn",
    "backend/teams.py": "Team persistence, public sharing, and team battle comparison endpoints",
    "backend/utils.py": "Team statistics, type coverage, STAB heuristics, and archetype detectors",
    "frontend/package.json": "Frontend NPM dependencies, build scripts, test commands, and size budgets",
    "frontend/vite.config.ts": "Vite configuration with React, Tailwind CSS 4, and Vite PWA plugins",
    "frontend/vitest.config.ts": "Vitest runner configuration with JSDOM and setupFiles",
    "frontend/playwright.config.ts": "Playwright end-to-end test runner configuration across projects",
    "scripts/export_openapi.py": "Exports live FastAPI OpenAPI JSON schema to frontend/openapi.json",
    "scripts/gen_file_tree.py": "Generates the file tree block in docs/FILE_STRUCTURE.md",
    "scripts/populate_extended.py": "CLI ingestion pipeline importing official PokéAPI CSV data into database",
    "tests/conftest.py": "Pytest configuration with temp SQLite isolation and engine safety guard",
}

EXCLUDE_PATTERNS = {
    "node_modules", ".venv", "venv", "dist", "test-results",
    "playwright-report", ".cache", "__pycache__", ".pytest_cache", ".ruff_cache"
}


def build_tree_lines():
    repo_root = Path(__file__).resolve().parent.parent
    result = subprocess.run(
        ["git", "ls-files"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=True,
    )
    raw_files = [f.replace("\\", "/") for f in result.stdout.strip().splitlines()]
    files = [
        f for f in raw_files
        if not any(ex in f.split("/") for ex in EXCLUDE_PATTERNS)
    ]

    # Organize files into nested directory tree
    tree = lambda: defaultdict(tree)
    root = tree()

    for path in sorted(files):
        parts = path.split("/")
        curr = root
        for part in parts:
            curr = curr[part]

    lines = ["poke_architect/"]

    def walk(node, prefix="", current_path="", depth=1):
        items = sorted(node.keys())
        dirs = [item for item in items if isinstance(node[item], defaultdict) and len(node[item]) > 0]
        leaves = [item for item in items if not (isinstance(node[item], defaultdict) and len(node[item]) > 0)]

        all_items = dirs + leaves
        total = len(all_items)

        for idx, item in enumerate(all_items):
            is_last = (idx == total - 1)
            branch = "└── " if is_last else "├── "
            extension = "    " if is_last else "│   "
            item_path = f"{current_path}/{item}" if current_path else item

            is_dir = item in dirs
            if is_dir:
                desc = ANNOTATIONS.get(item_path, "")
                suffix = f" # {desc}" if desc else ""
                lines.append(f"{prefix}{branch}{item}/{suffix}")
                if depth < 3:
                    walk(node[item], prefix + extension, item_path, depth + 1)
                else:
                    # Summarize remaining children
                    child_count = len(node[item])
                    if child_count > 0:
                        lines.append(f"{prefix}{extension}└── ... ({child_count} files/subdirs)")
            else:
                desc = FILE_ANNOTATIONS.get(item_path, "")
                suffix = f" # {desc}" if desc else ""
                lines.append(f"{prefix}{branch}{item}{suffix}")

    walk(root)
    return "\n".join(lines)


def update_file_structure_doc():
    repo_root = Path(__file__).resolve().parent.parent
    target_file = repo_root / "docs" / "FILE_STRUCTURE.md"

    if not target_file.exists():
        print(f"Target file {target_file} not found. Skipped.")
        return

    content = target_file.read_text(encoding="utf-8")
    start_marker = "<!-- tree:start -->"
    end_marker = "<!-- tree:end -->"

    if start_marker not in content or end_marker not in content:
        print(f"Markers {start_marker} and {end_marker} not found in {target_file}.")
        return

    pre = content.split(start_marker)[0] + start_marker + "\n```text\n"
    post = "\n```\n" + end_marker + content.split(end_marker)[1]

    tree_str = build_tree_lines()
    updated = pre + tree_str + post
    target_file.write_text(updated, encoding="utf-8")
    print(f"Successfully updated file tree in {target_file}")


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    if len(sys.argv) > 1 and sys.argv[1] == "--print":
        print(build_tree_lines())
    else:
        update_file_structure_doc()
