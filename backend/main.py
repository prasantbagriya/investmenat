from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.api import upstox, websocket_portfolio, websocket_market

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update this to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(upstox.router, prefix=f"{settings.API_V1_STR}/upstox", tags=["upstox"])
app.include_router(websocket_portfolio.router, prefix=f"{settings.API_V1_STR}", tags=["websocket", "portfolio"])
app.include_router(websocket_market.router, prefix=f"{settings.API_V1_STR}", tags=["websocket", "market"])

@app.get("/")
async def root():
    return {"message": "Welcome to the InvestMant Trading Backend API", "version": settings.VERSION}
