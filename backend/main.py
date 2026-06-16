from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import accounts, carousel, reels

app = FastAPI(title="Reels Insight API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts.router)
app.include_router(reels.router)
app.include_router(carousel.router)


@app.get("/health")
def health():
    return {"status": "ok"}
