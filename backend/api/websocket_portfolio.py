import asyncio
import json
import httpx
import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from backend.core.config import settings

router = APIRouter()

async def get_portfolio_stream_url(authorization: str) -> str:
    """Fetch the authorized WebSocket URL for Portfolio Stream"""
    headers = {
        "Api-Version": "2.0",
        "Authorization": authorization,
        "Accept": "application/json"
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.UPSTOX_API_BASE_URL}/portfolio/stream-feed/authorize",
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        data = response.json()
        return data["data"]["authorizedRedirectUri"]

@router.websocket("/ws/portfolio")
async def portfolio_websocket(websocket: WebSocket, token: str):
    """
    WebSocket endpoint for React clients to listen to live Order Updates.
    Pass ?token=Bearer... in the connection URL.
    """
    await websocket.accept()
    
    try:
        # 1. Fetch authorized WebSocket URL from Upstox
        upstox_ws_url = await get_portfolio_stream_url(token)
        
        # 2. Connect to Upstox Portfolio Stream
        async with websockets.connect(upstox_ws_url) as upstox_ws:
            print("[Portfolio WS] Connected to Upstox")
            
            # Relay messages from Upstox to the React client
            while True:
                message = await upstox_ws.recv()
                
                # Upstox Portfolio stream sends JSON strings
                parsed_message = json.loads(message)
                
                # Forward to React client
                await websocket.send_json(parsed_message)
                
    except WebSocketDisconnect:
        print("[Portfolio WS] Client disconnected")
    except Exception as e:
        print(f"[Portfolio WS] Error: {e}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass
