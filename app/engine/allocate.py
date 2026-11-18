"""Exact integer allocation using the largest-remainder (Hamilton) method."""

from __future__ import annotations


def allocate_largest_remainder(total: int, weights: list[int]) -> list[int]:
    """Split integer `total` across `weights` so parts sum exactly to `total`.

    Every part receives floor(total * weight / weight_sum), and the leftover kobo
    are handed out 1 at a time to the items with the largest remainders.
    """
    if total < 0:
        raise ValueError("Total to allocate cannot be negative.")
    if not weights:
        return []
    if any(w < 0 for w in weights):
        raise ValueError("Allocation weights cannot be negative.")
    if total == 0:
        return [0] * len(weights)

    weight_sum = sum(weights)
    effective_weights = [1] * len(weights) if weight_sum == 0 else weights
    effective_sum = sum(effective_weights)

    bases: list[int] = []
    remainders: list[tuple[int, int]] = []
    for idx, weight in enumerate(effective_weights):
        numerator = total * weight
        base = numerator // effective_sum
        rem = numerator % effective_sum
        bases.append(base)
        remainders.append((rem, idx))

    leftover = total - sum(bases)
    # Sort descending by remainder, breaking ties deterministically by earliest index.
    remainders.sort(key=lambda pair: (-pair[0], pair[1]))
    for _, idx in remainders[:leftover]:
        bases[idx] += 1

    return bases


def allocate_dict(total: int, weight_map: dict[str, int]) -> dict[str, int]:
    """Allocate `total` across keys of `weight_map` using largest-remainder."""
    if not weight_map:
        return {}
    keys = list(weight_map.keys())
    weights = [max(0, int(weight_map[k])) for k in keys]
    allocated = allocate_largest_remainder(total, weights)
    return dict(zip(keys, allocated, strict=True))
