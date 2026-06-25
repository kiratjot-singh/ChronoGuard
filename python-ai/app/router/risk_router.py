def risk_router(state):

    risk = state["risk"]["risk_score"]

    if risk >= 70:
        return "high"

    elif risk >= 40:
        return "medium"

    else:
        return "low"