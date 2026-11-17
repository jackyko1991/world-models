"""Two ways to keep a generated world.

The camera stands at the centre of a small round world and turns (yaw only). A view is a strip of VIEW columns
covering 60 degrees; each column is either sky (None) or the front face of an object (a colour and a height).

(a) A **frame model**: each new view is generated from the views of the last ``memory`` steps only. A column that was
    in one of those views is copied; a column nobody remembers is invented afresh. Turn away for long enough and come
    back, and the place is re-invented, so it may have changed.
(b) An **explicit 3-D scene**: a fixed set of splats (points with a size and a colour), rendered by projecting each
    onto the strip and keeping the nearest. Rendering is a pure function of the camera, so coming back shows the same
    thing.

Both start from the same first view (the frame model is "prompted" with a render of the scene), like Genie 2 or a
World Labs model prompted with one image.
"""

import math
from dataclasses import dataclass, field
from typing import NamedTuple, Optional

import numpy as np

RING = 48  # columns all the way round
VIEW = 8  # columns in one view (VIEW / RING * 360 = 60 degrees)
COLOURS = 6  # palette size
FORGOTTEN = "forgotten"  # what recall() returns for a column no remembered view contains


class Face(NamedTuple):
    colour: int
    height: float  # on-screen height


Column = Optional[Face]  # None is sky
View = list[Column]


class Splat(NamedTuple):
    az: float  # direction from the camera, in columns (0 ... RING)
    dist: float  # distance from the camera
    radius: float  # half-width, in the same units as dist
    top: float  # top of the splat above the ground
    colour: int


def ring_col(yaw: int, i: int) -> int:
    """Absolute ring column of view column i when the view's left edge is at ``yaw``."""
    return (yaw + i) % RING


# ---- (b) the explicit scene ---------------------------------------------------------------------------------------


def make_scene(rng: np.random.Generator) -> list[Splat]:
    """A fixed scene of 14 objects round the camera, each a few splats wide."""
    splats = []
    for o in range(14):
        az = o * (RING / 14) + 1.5 * rng.random()
        dist = 3 + 5 * rng.random()
        top = 1 + 2.5 * rng.random()
        colour = int(rng.integers(COLOURS))
        for k in range(2 + int(rng.integers(3))):
            splats.append(Splat(az + 0.7 * k, dist, 0.35 * dist * (2 * math.pi / RING), top, colour))
    return splats


# region project
def render_scene(splats: list[Splat], yaw: int) -> View:
    """Project every splat onto the strip; in each column keep the nearest splat (a z-buffer)."""
    view: View = [None] * VIEW
    depth = [math.inf] * VIEW
    col_angle = 2 * math.pi / RING  # one column, in radians
    for s in splats:
        half = math.atan(s.radius / s.dist) / col_angle  # angular half-width, in columns
        for i in range(VIEW):
            d = yaw + i + 0.5 - s.az  # angle from the splat to the column centre, in columns
            d = (d + RING / 2) % RING - RING / 2  # wrapped into [-RING/2, RING/2)
            if abs(d) <= half + 0.5 and s.dist < depth[i]:
                depth[i] = s.dist
                view[i] = Face(s.colour, s.top / s.dist)  # farther = shorter on screen
    return view
# endregion


# ---- (a) the frame model -------------------------------------------------------------------------------------------


@dataclass
class FrameModel:
    t: int  # steps taken so far
    yaw: int
    memory: list[tuple[int, View]] = field(default_factory=list)  # the last views with their yaw, most recent last
    seed: int = 5


def start_frame_model(first: View, yaw: int, seed: int = 5) -> FrameModel:
    return FrameModel(t=0, yaw=yaw, memory=[(yaw, first)], seed=seed)


def invent(neighbour: Column, rng: np.random.Generator) -> Column:
    """A plausible column to fill a gap: often continue the neighbouring object, otherwise sky or a new object."""
    if neighbour is not None and rng.random() < 0.55:
        return neighbour
    if rng.random() < 0.4:
        return None
    return Face(int(rng.integers(COLOURS)), 0.15 + 0.55 * rng.random())


# region framestep
def step_frame_model(m: FrameModel, direction: int, memory: int) -> FrameModel:
    """Turn by ``direction`` (+1 or -1 column) and generate the next view from the last ``memory`` views only:
    remembered columns are copied, forgotten ones invented (random numbers seeded by the step, so runs repeat)."""
    t = m.t + 1
    yaw = (m.yaw + direction) % RING
    rng = np.random.default_rng(m.seed * 100003 + t)
    recent = m.memory[-memory:]

    def recall(col: int):
        """The most recent remembered content of ring column ``col``, or "forgotten"."""
        for seen_yaw, seen_view in reversed(recent):
            i = (col - seen_yaw) % RING
            if i < VIEW:
                return seen_view[i]
        return FORGOTTEN

    view: View = [None] * VIEW
    # fill from the side we came from, so an invented column can continue its neighbour
    order = range(VIEW) if direction == 1 else range(VIEW - 1, -1, -1)
    for i in order:
        known = recall(ring_col(yaw, i))
        neighbour = view[i - direction] if 0 <= i - direction < VIEW else None
        view[i] = invent(neighbour, rng) if known is FORGOTTEN else known
    return FrameModel(t, yaw, recent + [(yaw, view)], m.seed)
# endregion


def turn(m: FrameModel, steps: int, memory: int) -> FrameModel:
    """Turn the frame model by ``steps`` columns one step at a time (negative = the other way)."""
    for _ in range(abs(steps)):
        m = step_frame_model(m, 1 if steps > 0 else -1, memory)
    return m


def same_column(a: Column, b: Column) -> bool:
    if a is None or b is None:
        return a is b
    return a.colour == b.colour and abs(a.height - b.height) < 1e-9


def differences(a: View, b: View) -> int:
    """Number of columns in which two views differ."""
    return sum(not same_column(x, y) for x, y in zip(a, b))
