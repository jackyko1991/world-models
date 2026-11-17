"""3D Gaussian splatting, small and exact (Zwicker et al. 2001; Kerbl et al. 2023).

A 3-D Gaussian has a mean μ, a covariance Σ = R S Sᵀ Rᵀ (R from a unit quaternion, S = diag(scales)), an opacity o
and a colour stored as spherical-harmonic coefficients (degree 0 and 1). To draw it:

    t   = W (μ − p_cam)                 the mean in camera coordinates (W: the view rotation)
    u   = f_x t_x / t_z + c_x            the perspective divide (and v likewise)
    Σ′  = J W Σ Wᵀ Jᵀ + 0.3 I           EWA: J is the Jacobian of the divide at t
    α   = o · exp(−½ dᵀ Σ′⁻¹ d)          at a pixel, d = pixel − projected mean
    C   = Σ_i c_i α_i T_i,  T_i = Π_{j<i} (1 − α_j)     nearest first

Conventions (shared with scripts/splat2d.py and scripts/splat3d.py, which train the scenes): world y is up; camera
coordinates have x right, y down, z forward; pixel (i, j) is sampled at its centre (i + ½, j + ½); c_x = width / 2.
This is the readable model; the trainers are the torch scripts. The browser runs the same model, ported to
TypeScript (src/models/splat.ts), and python/tests/test_splat.py checks that the two agree.
"""

from dataclasses import dataclass, field, replace

import numpy as np

# Thresholds of the 3DGS rasteriser: a splat's pixel below ALPHA_MIN is skipped, alpha is clamped at ALPHA_MAX, and a
# pixel stops once the light left, T, would fall below T_MIN.
ALPHA_MIN = 1 / 255
ALPHA_MAX = 0.99
T_MIN = 1e-4
# spherical-harmonic constants for degree 0 and 1
SH_C0 = 0.28209479177387814
SH_C1 = 0.4886025119029199


@dataclass
class Splat:
    """One 3-D Gaussian. sh holds 12 numbers: for k = 0..3 (DC, then the three degree-1 terms), sh[3k + channel]."""

    mean: np.ndarray  # (3,)
    quat: np.ndarray  # (4,) unit quaternion [w, x, y, z]
    scale: np.ndarray  # (3,) standard deviations along the Gaussian's own axes
    opacity: float
    sh: np.ndarray  # (12,) or (3,) for degree 0 only


# --- the 3-D Gaussian ------------------------------------------------------------------------------------------
# region covariance
def quat_to_rot(q) -> np.ndarray:
    """The rotation matrix of a quaternion [w, x, y, z] (normalised first)."""
    w, x, y, z = np.asarray(q, dtype=float) / np.linalg.norm(q)
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
        [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
        [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
    ])


def covariance_3d(q, s) -> np.ndarray:
    """Σ = R S Sᵀ Rᵀ = M Mᵀ with M = R S: symmetric, and positive definite whenever every scale is non-zero."""
    M = quat_to_rot(q) * np.asarray(s, dtype=float)  # R · diag(s) scales column j by s[j]
    return M @ M.T
# endregion


# region sh_colour
def sh_colour(sh, direction) -> np.ndarray:
    """The colour seen along `direction` (unit, camera → Gaussian): 0.5 + SH degree 0 and 1, clipped to [0, 1]."""
    sh = np.asarray(sh, dtype=float)
    x, y, z = direction
    c = 0.5 + SH_C0 * sh[0:3]  # degree 0: the same from every side
    if len(sh) >= 12:  # degree 1: linear in the direction
        c = c + SH_C1 * (-y * sh[3:6] + z * sh[6:9] - x * sh[9:12])
    return np.clip(c, 0.0, 1.0)
# endregion


# --- the camera ------------------------------------------------------------------------------------------------
@dataclass
class Camera:
    pos: np.ndarray  # position in the world
    W: np.ndarray  # view rotation: rows are the camera's right, down and forward axes, so t = W (p − pos)
    fx: float
    fy: float
    cx: float
    cy: float
    width: int
    height: int
    near: float = 0.2  # Gaussians nearer than this are skipped


def orbit_camera(az: float, el: float, radius: float, target, fovy: float, width: int, height: int) -> Camera:
    """A camera on a sphere around `target`, looking at it: azimuth about world y, elevation above the ground."""
    target = np.asarray(target, dtype=float)
    pos = target + radius * np.array([np.cos(el) * np.sin(az), np.sin(el), np.cos(el) * np.cos(az)])
    forward = (target - pos) / np.linalg.norm(target - pos)
    right = np.cross(forward, [0.0, 1.0, 0.0])
    right /= np.linalg.norm(right)
    down = np.cross(forward, right)
    f = height / 2 / np.tan(fovy / 2)
    return Camera(pos, np.array([right, down, forward]), f, f, width / 2, height / 2, width, height)


def to_camera(cam: Camera, p) -> np.ndarray:
    """World point → camera coordinates t = W (p − pos)."""
    return cam.W @ (np.asarray(p, dtype=float) - cam.pos)


def project_point(cam: Camera, p) -> np.ndarray:
    """The pinhole projection of a world point to pixel coordinates (u, v)."""
    tx, ty, tz = to_camera(cam, p)
    return np.array([cam.fx * tx / tz + cam.cx, cam.fy * ty / tz + cam.cy])


# region perspective_jacobian
def perspective_jacobian(t, fx: float, fy: float) -> np.ndarray:
    """J = ∂(u, v)/∂(t_x, t_y, t_z) of u = f_x t_x / t_z, v = f_y t_y / t_z: the 2×3 tangent of the divide at t."""
    x, y, z = t
    return np.array([
        [fx / z, 0.0, -fx * x / z**2],
        [0.0, fy / z, -fy * y / z**2],
    ])
# endregion


# region project_covariance
def project_covariance(cam: Camera, mean, sigma: np.ndarray, blur: float = 0.3) -> np.ndarray:
    """EWA: Σ′ = J W Σ Wᵀ Jᵀ, a 2×2 covariance in pixels², plus blur · I.

    W turns the world axes into the camera's; J flattens camera space onto the image, linearised at the mean.
    The blur (0.3 px² in 3DGS) is a low-pass filter: no splat gets thinner than about a pixel.
    """
    J = perspective_jacobian(to_camera(cam, mean), cam.fx, cam.fy)
    T = J @ cam.W  # 2×3: world → pixels, near the mean
    return T @ sigma @ T.T + blur * np.eye(2)
# endregion


def splat_radius(cov: np.ndarray, opacity: float) -> float:
    """Box half-width beyond which opacity · exp(−½ dᵀ Σ′⁻¹ d) < 1/255 (0 if fainter than that everywhere)."""
    m2 = 2 * np.log(opacity / ALPHA_MIN)  # squared Mahalanobis distance where alpha reaches 1/255
    largest = np.linalg.eigvalsh(cov)[-1]
    return float(np.sqrt(m2 * largest)) if m2 > 0 else 0.0


@dataclass
class Projected:
    """A Gaussian on the screen, ready to composite."""

    index: int  # position in the input list
    x: float  # screen position of the mean, pixels
    y: float
    depth: float  # camera-space t_z (the sort key)
    cov: np.ndarray  # Σ′, 2×2
    conic: np.ndarray  # Σ′⁻¹
    opacity: float
    rgb: np.ndarray
    radius: float = field(default=0.0)  # half-width of the box outside which alpha < 1/255


def project_splat(s: Splat, cam: Camera, index: int = 0, blur: float = 0.3) -> Projected | None:
    """Project one Gaussian: screen mean, depth, Σ′, its inverse and the view-dependent colour (None if behind)."""
    t = to_camera(cam, s.mean)
    if t[2] < cam.near:
        return None
    cov = project_covariance(cam, s.mean, covariance_3d(s.quat, s.scale), blur)
    if np.linalg.det(cov) <= 0:
        return None
    direction = (s.mean - cam.pos) / np.linalg.norm(s.mean - cam.pos)
    return Projected(
        index=index,
        x=cam.fx * t[0] / t[2] + cam.cx,
        y=cam.fy * t[1] / t[2] + cam.cy,
        depth=t[2],
        cov=cov,
        conic=np.linalg.inv(cov),
        opacity=s.opacity,
        rgb=sh_colour(s.sh, direction),
        radius=splat_radius(cov, s.opacity),
    )


# --- compositing -----------------------------------------------------------------------------------------------
# region splat_alpha
def splat_alpha(p: Projected, px, py):
    """How much of pixel (px, py) the splat covers: α = o · exp(−½ dᵀ Σ′⁻¹ d), clamped to 0.99, and 0 below 1/255.

    px and py may be numbers or arrays (a whole block of pixels at once).
    """
    dx, dy = np.asarray(px) - p.x, np.asarray(py) - p.y
    a, b, c = p.conic[0, 0], p.conic[0, 1], p.conic[1, 1]
    power = -0.5 * (a * dx * dx + 2 * b * dx * dy + c * dy * dy)
    alpha = np.minimum(ALPHA_MAX, p.opacity * np.exp(np.minimum(power, 0.0)))
    return np.where((power > 0) | (alpha < ALPHA_MIN), 0.0, alpha)
# endregion


# region composite_front_to_back
def composite_front_to_back(layers: list[tuple[np.ndarray, float]], background) -> np.ndarray:
    """One pixel, layers (colour, alpha) nearest first:  C = Σ_i c_i α_i T_i + T · background.

    T is the light still getting through; each layer takes its share α_i T_i and passes on (1 − α_i) of the rest.
    """
    C, T = np.zeros(3), 1.0
    for colour, alpha in layers:
        C += np.asarray(colour) * alpha * T
        T *= 1 - alpha
    return C + T * np.asarray(background)
# endregion


def composite_back_to_front(layers: list[tuple[np.ndarray, float]], background) -> np.ndarray:
    """The painter's algorithm: start from the background and lay each layer over it, farthest first. Same answer."""
    C = np.asarray(background, dtype=float)
    for colour, alpha in reversed(layers):
        C = np.asarray(colour) * alpha + C * (1 - alpha)
    return C


def sort_by_depth(projected: list[Projected]) -> list[Projected]:
    """Nearest first (a stable sort, so equal depths keep their list order)."""
    return sorted(projected, key=lambda p: p.depth)


# region composite
def composite(ordered: list[Projected], width: int, height: int, background=(1.0, 1.0, 1.0)):
    """Front-to-back compositing of a whole image, splats nearest first, with the 3DGS early stop.

    Each pixel does  C += c α T,  T ← T (1 − α),  and is finished once T would fall below 10⁻⁴. Pixels do not
    talk to each other, so we can take one splat at a time and update every pixel in its bounding box at once.
    Returns the image (height, width, 3) and the light left over, T (height, width).
    """
    C = np.zeros((height, width, 3))
    T = np.ones((height, width))
    done = np.zeros((height, width), dtype=bool)
    for p in ordered:
        if p.radius <= 0:
            continue
        # the pixels whose centres can see this splat at all
        x0, x1 = max(0, int(np.floor(p.x - p.radius - 0.5))), min(width - 1, int(np.ceil(p.x + p.radius - 0.5)))
        y0, y1 = max(0, int(np.floor(p.y - p.radius - 0.5))), min(height - 1, int(np.ceil(p.y + p.radius - 0.5)))
        if x0 > x1 or y0 > y1:
            continue
        j, i = np.mgrid[y0 : y1 + 1, x0 : x1 + 1]
        alpha = splat_alpha(p, i + 0.5, j + 0.5)
        box = (slice(y0, y1 + 1), slice(x0, x1 + 1))
        live = ~done[box] & (alpha > 0)
        t_next = T[box] * (1 - alpha)
        stop = live & (t_next < T_MIN)  # almost no light left: this pixel is finished
        done[box] |= stop
        draw = live & ~stop
        C[box] += np.where(draw[..., None], p.rgb * (alpha * T[box])[..., None], 0.0)
        T[box] = np.where(draw, t_next, T[box])
    return C + T[..., None] * np.asarray(background), T
# endregion


def render_splats(splats: list[Splat], cam: Camera, background=(1.0, 1.0, 1.0), blur: float = 0.3):
    """Project, sort by depth and composite a whole scene. Returns (image, T, the projected splats in order)."""
    projected = [p for k, s in enumerate(splats) if (p := project_splat(s, cam, k, blur)) is not None]
    ordered = sort_by_depth(projected)
    image, T = composite(ordered, cam.width, cam.height, background)
    return image, T, ordered


# --- 2-D Gaussians (the image-fitting demo) ---------------------------------------------------------------------
def gauss_2d_to_projected(g, index: int) -> Projected:
    """A Gaussian as scripts/splat2d.py stores it, [x, y, sx, sy, θ, r, g, b, opacity] in pixels, as a screen splat.

    Σ = R(θ) diag(sx², sy²) R(θ)ᵀ; its depth is its index, so the list order is the compositing order.
    """
    x, y, sx, sy, theta, r, gr, b, opacity = g
    R = np.array([[np.cos(theta), -np.sin(theta)], [np.sin(theta), np.cos(theta)]])
    cov = R @ np.diag([sx * sx, sy * sy]) @ R.T
    return Projected(index, x, y, index, cov, np.linalg.inv(cov), opacity, np.array([r, gr, b]), splat_radius(cov, opacity))


def decode_splats(data: np.ndarray) -> list[Splat]:
    """public/models/splat3d.bin: 23 float32s per Gaussian (mean 3, quat 4, scale 3, opacity 1, sh 12)."""
    rows = np.asarray(data, dtype=float).reshape(-1, 23)
    return [Splat(f[0:3], f[3:7], f[7:10], float(f[10]), f[11:23]) for f in rows]


# --- a moving scene (Concepts ▸ toward world models) -------------------------------------------------------------
def quat_y(a: float) -> np.ndarray:
    """A turn by angle a about world y, as a quaternion."""
    return np.array([np.cos(a / 2), 0.0, np.sin(a / 2), 0.0])


def quat_mul(q, r) -> np.ndarray:
    """The Hamilton product q ⊗ r: first turn by r, then by q."""
    w1, x1, y1, z1 = q
    w2, x2, y2, z2 = r
    return np.array([
        w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
        w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
        w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
        w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
    ])


def ball_height(t: float) -> float:
    """Height of the bouncing ball's centre at time t ∈ [0, 1]: two bounces, each a parabola."""
    phase = (2 * t) % 1
    return 0.25 + 1.6 * phase * (1 - phase)


# region deform
def deform(canonical: list[Splat], part: list[str], t: float) -> list[Splat]:
    """The deformation field: canonical Gaussians → where they are at time t.

    Means move, μ(t) = f(μ₀, t); the box's Gaussians also turn, q(t) = Δq(t) ⊗ q₀. D-NeRF and 4D-GS learn such a
    field with networks; here it is written down. `part` says what each Gaussian belongs to.
    """
    spin = 2 * np.pi * t
    dq = quat_y(spin)
    R = quat_to_rot(dq)
    ball = np.array([-0.55, ball_height(t), 0.2])
    box = np.array([0.5, 0.0, -0.3])
    out = []
    for g, kind in zip(canonical, part):
        if kind == "ball":  # bounce, squashing a little near the floor
            squash = max(0.0, 0.3 - ball[1]) * 1.5
            out.append(replace(g, mean=ball + g.mean * np.array([1 + squash, 1 - squash, 1 + squash])))
        elif kind == "box":  # spin about the box's vertical axis: move the mean and turn the ellipsoid
            m = R @ g.mean
            out.append(replace(g, mean=np.array([box[0] + m[0], m[1], box[2] + m[2]]), quat=quat_mul(dq, g.quat)))
        elif kind == "moon":  # orbit the box twice, bobbing
            a = 2 * spin
            centre = np.array([box[0] + 0.55 * np.cos(a), 0.75 + 0.1 * np.sin(2 * a), box[2] + 0.55 * np.sin(a)])
            out.append(replace(g, mean=centre + g.mean))
        else:  # the floor stays put
            out.append(g)
    return out
# endregion
