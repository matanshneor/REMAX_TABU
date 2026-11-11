from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import export

app = FastAPI(title="RE/MAX Tabu CRM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(export.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
