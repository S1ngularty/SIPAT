from fastapi import FastAPI

from api.v1.detection import router as detection_router


app = FastAPI(
    title="SIPAT AI Server",
    version="1.0.0",
)


app.include_router(
    detection_router,
    prefix="/api/v1",
)

@app.router.get("/ping")
async def healthy():
    return {"status": "ok"}
