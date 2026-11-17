import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))  # import wm without installing it


@pytest.fixture
def fixture():
    """fixture("cartpole") -> the JSON the TypeScript port wrote to python/tests/fixtures/cartpole.json"""
    return lambda name: json.loads((ROOT / "python" / "tests" / "fixtures" / f"{name}.json").read_text())


@pytest.fixture
def asset():
    """asset("tiny-nerf.json") -> public/models/tiny-nerf.json (weights shared with the browser)"""
    return lambda name: json.loads((ROOT / "public" / "models" / name).read_text())
