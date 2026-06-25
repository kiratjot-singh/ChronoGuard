from app.services.gemini_service import llm
from app.schemas.supervisor_schema import SupervisorSchema

structured_llm = llm.with_structured_output(
    SupervisorSchema
)


def supervisor_agent(user_query):

    prompt = f"""
    Decide which workflow to execute.

    Available workflows:

    planning

    simulation

    analysis

    User:

    {user_query}
    """

    return structured_llm.invoke(prompt)