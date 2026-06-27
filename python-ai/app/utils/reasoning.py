def add_reasoning(
    state,
    agent,
    decision,
    confidence,
    reasoning,
):

    state["reasoning"].append(
        {
            "agent": agent,
            "decision": decision,
            "confidence": confidence,
            "reasoning": reasoning,
        }
    )

    return state