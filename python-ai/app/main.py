from fastapi import FastAPI

from app.api.routes import router
from app.events.scheduler import event_scheduler

app = FastAPI(
    title="ChronoGuard AI",
    version="1.0.0"
)

app.include_router(router)


@app.on_event("startup")
def startup_event():
    event_scheduler.start()


@app.on_event("shutdown")
def shutdown_event():
    event_scheduler.stop()


@app.get("/")
def home():
    return {
        "message": "ChronoGuard AI is running 🚀"
    }