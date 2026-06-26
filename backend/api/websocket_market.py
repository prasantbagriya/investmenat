import asyncio
import httpx
import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from backend.core.config import settings

# Note: Upstox Market Data Feed uses Protocol Buffers.
# In a full implementation, you must compile the Upstox 'MarketDataFeed.proto' 
# using `protoc` and import the generated classes here to decode the binary data.
# For now, this relays the binary stream or hex representation.

router = APIRouter()

async def get_market_stream_url(authorization: str) -> str:
    """Fetch the authorized WebSocket URL for Market Data Stream"""
    headers = {
        "Api-Version": "2.0",
        "Authorization": authorization,
        "Accept": "application/json"
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.UPSTOX_API_BASE_URL}/market-quote/ws/authorize",
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        data = response.json()
        return data["data"]["authorizedRedirectUri"]

@router.websocket("/ws/market")
async def market_websocket(websocket: WebSocket, token: str):
    """
    WebSocket endpoint for React clients to listen to live Market Data.
    Pass ?token=Bearer... in the connection URL.
    """
    await websocket.accept()
    
    try:
        upstox_ws_url = await get_market_stream_url(token)
        
        async with websockets.connect(upstox_ws_url) as upstox_ws:
            print("[Market WS] Connected to Upstox")
            
            # Subscribe to specific instrument keys (example payload)
            # You would normally receive this subscription list from the React frontend
            subscription_payload = {
                "guid": "investmant_client",
                "method": "sub",
                "data": {
                    "mode": "full",
                    "instrumentKeys": ["NSE_EQ|INE002A01018"] # Reliance as an example
                }
            }
            # Upstox requires binary format for subscriptions in v2, 
            # so the payload needs to be serialized via protobuf too.
            # This is a placeholder for the actual protobuf byte generation.
            print("[Market WS] Sending subscription (Requires Protobuf)")
            
            while True:
                message = await upstox_ws.recv()
                # `message` is binary data (Protobuf).
                # Here you would decode it: FeedResponse().ParseFromString(message)
                
                # For now, we will send a notification to the client that a tick arrived.
                # In production, send the decoded JSON.
                await websocket.send_json({
                    "type": "market_tick",
                    "status": "binary_received",
                    "bytes": len(message)
                })
                
    except WebSocketDisconnect:
        print("[Market WS] Client disconnected")
    except Exception as e:
        print(f"[Market WS] Error: {e}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass
