"""
The gridworld: the true step obeys its rules (walls, ice, key and door, reward), the learned model agrees with it
on plain floor and differs exactly where the page says it does (ice and the door), frames differ only there, and both
step functions agree with the TypeScript port (src/models/gridworld.ts).
"""

from wm.gridworld import ACTIONS, DELTA, MAP, State, diff_cells, learned_step, observe, rollout, start, true_step


def test_walls_block_a_move_floor_allows_it():
    assert true_step(start(), "up").next == start()  # a wall above the start
    assert true_step(start(), "right").next == State(1, 2)


def test_ice_slides_the_agent_on_the_learned_model_stops_on_the_first_ice_cell():
    assert true_step(State(1, 3), "right").next == State(1, 6)
    assert learned_step(State(1, 3), "right").next == State(1, 4)
    assert true_step(State(1, 6), "left").next == State(1, 3)
    # sliding into a wall stops on the ice, where both agree
    assert true_step(State(2, 4), "up").next == State(1, 4)
    assert learned_step(State(2, 4), "up").next == State(1, 4)


# region door
def test_the_door_opens_only_with_the_key_the_learned_model_never_lets_you_through():
    assert true_step(State(2, 6), "down").next == State(2, 6)  # locked
    with_key = State(2, 6, has_key=True)
    assert true_step(with_key, "down").next == State(3, 6, has_key=True, door_open=True)
    assert learned_step(with_key, "down").next == with_key
    # the predicted frame differs from the true one in exactly two cells: where the agent is and where it is not
    true_frame = observe(true_step(with_key, "down").next)
    predicted_frame = observe(learned_step(with_key, "down").next)
    assert diff_cells(true_frame, predicted_frame) == [(2, 6), (3, 6)]
# endregion


def test_key_pickup_then_a_full_path_to_the_goal_with_reward_1_at_the_end():
    s = rollout(true_step, start(), ["down", "down"])
    assert s[2].has_key
    assert observe(s[2])[3][1] == "A"
    to_goal = ["up", "up", "right", "right", "right", "right", "down", "down", "down", "down"]
    states = rollout(true_step, s[2], to_goal)
    # right from (1,3) slides over the ice to (1,6), so one "right" is spare and bumps the wall
    assert states[-1] == State(5, 6, has_key=True, door_open=True)
    assert true_step(states[-2], "down").reward == 1
    assert true_step(start(), "right").reward == 0


def test_the_learned_model_is_exactly_right_except_when_the_move_enters_ice_or_the_door():
    agree = 0
    for row in range(1, 6):
        for col in range(1, 7):
            if MAP[row][col] in ("wall", "door"):
                continue
            for has_key in (False, True):
                s = State(row, col, has_key)
                for a in ACTIONS:
                    dr, dc = DELTA[a]
                    entering = MAP[row + dr][col + dc]
                    if true_step(s, a) == learned_step(s, a):
                        agree += 1
                    else:
                        assert entering in ("ice", "door"), f"{row},{col} {a} enters {entering}"
    assert agree > 150


def _state(d: dict) -> State:
    return State(d["row"], d["col"], d["hasKey"], d["doorOpen"])


def test_agrees_with_typescript(fixture):
    f = fixture("gridworld")
    assert start() == _state(f["start"])
    for case in f["cases"]:
        s, a = _state(case["s"]), case["a"]
        for step, key in ((true_step, "true"), (learned_step, "learned")):
            t = step(s, a)
            assert t.next == _state(case[key]["next"]), (case, key)
            assert t.reward == case[key]["reward"]
    for item in f["frames"]:
        assert observe(_state(item["s"])) == item["frame"]
    assert rollout(true_step, start(), f["path"]) == [_state(d) for d in f["trueRollout"]]
    assert rollout(learned_step, start(), f["path"]) == [_state(d) for d in f["learnedRollout"]]
