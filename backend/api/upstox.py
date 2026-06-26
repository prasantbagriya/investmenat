from fastapi import APIRouter, Depends, HTTPException, Header, Query
import httpx
from pydantic import BaseModel
from backend.core.config import settings
from typing import Optional

router = APIRouter()

def get_upstox_headers(authorization: str = Header(...)):
    """Dependency to extract and validate the authorization token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    return {
        "Api-Version": "2.0",
        "Authorization": authorization,
        "Accept": "application/json"
    }

class OrderRequest(BaseModel):
    quantity: int
    product: str # D, I, CO, BO, AMO
    validity: str # DAY, IOC
    price: float
    tag: Optional[str] = None
    instrument_token: str
    order_type: str # MARKET, LIMIT, SL, SL-M
    transaction_type: str # BUY, SELL
    disclosed_quantity: int = 0
    trigger_price: float = 0
    is_amo: bool = False

@router.get("/profile")
async def get_profile(headers: dict = Depends(get_upstox_headers)):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{settings.UPSTOX_API_BASE_URL}/user/profile", headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

@router.get("/funds")
async def get_funds(headers: dict = Depends(get_upstox_headers)):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{settings.UPSTOX_API_BASE_URL}/user/get-funds-and-margin", headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

@router.get("/holdings")
async def get_holdings(headers: dict = Depends(get_upstox_headers)):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{settings.UPSTOX_API_BASE_URL}/portfolio/long-term-holdings", headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

@router.get("/positions")
async def get_positions(headers: dict = Depends(get_upstox_headers)):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{settings.UPSTOX_API_BASE_URL}/portfolio/short-term-positions", headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

@router.get("/orders")
async def get_orders(headers: dict = Depends(get_upstox_headers)):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{settings.UPSTOX_API_BASE_URL}/order/retrieve-all", headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

@router.post("/order/place")
async def place_order(order: OrderRequest, headers: dict = Depends(get_upstox_headers)):
    headers["Content-Type"] = "application/json"
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.UPSTOX_API_BASE_URL}/order/place", 
            headers=headers,
            json=order.model_dump()
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

@router.get("/market-quote")
async def get_market_quote(symbol: str, headers: dict = Depends(get_upstox_headers)):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.UPSTOX_API_BASE_URL}/market-quote/quotes?instrument_key={symbol}", 
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

@router.get("/option-chain")
async def get_option_chain(instrument_key: str, expiry_date: str, headers: dict = Depends(get_upstox_headers)):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.UPSTOX_API_BASE_URL}/option/chain?instrument_key={instrument_key}&expiry_date={expiry_date}", 
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

@router.get("/historical-data")
async def get_historical_data(
    instrument_key: str, 
    interval: Optional[str] = None, 
    to_date: Optional[str] = None, 
    from_date: Optional[str] = None, 
    headers: dict = Depends(get_upstox_headers)
):
    async with httpx.AsyncClient() as client:
        if interval and to_date and from_date:
            url = f"{settings.UPSTOX_API_BASE_URL}/historical-candle/{instrument_key}/{interval}/{to_date}/{from_date}"
        else:
            url = f"{settings.UPSTOX_API_BASE_URL}/historical-candle/intraday/{instrument_key}/1minute"
            
        response = await client.get(url, headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

# ─────────────────────────────────────────────────────────────────
# FUNDAMENTALS — PE, PB, Dividend Yield, EPS, 52W High/Low, ROCE
# ─────────────────────────────────────────────────────────────────
@router.get("/fundamentals")
async def get_fundamentals(
    symbol: str = Query(..., description="Instrument key e.g. NSE_EQ|INE002A01018"),
    headers: dict = Depends(get_upstox_headers)
):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.UPSTOX_API_BASE_URL}/market-quote/quotes?instrument_key={symbol}",
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

# ─────────────────────────────────────────────────────────────────
# TRADE PROFIT & LOSS — Historical realized P&L per segment
# ─────────────────────────────────────────────────────────────────
@router.get("/trade-pnl")
async def get_trade_pnl(
    segment: str = Query("EQ", description="Segment: EQ, FO, COM, etc."),
    financial_year: str = Query("2023-24"),
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    headers: dict = Depends(get_upstox_headers)
):
    params = f"?segment={segment}&financial_year={financial_year}"
    if from_date:
        params += f"&from_date={from_date}"
    if to_date:
        params += f"&to_date={to_date}"
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.UPSTOX_API_BASE_URL}/trade/profit-loss/data{params}",
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

# ─────────────────────────────────────────────────────────────────
# TRADE P&L CHARGES — Brokerage and tax charges on P&L
# ─────────────────────────────────────────────────────────────────
@router.get("/trade-pnl-charges")
async def get_trade_pnl_charges(
    segment: str = Query("EQ"),
    financial_year: str = Query("2023-24"),
    headers: dict = Depends(get_upstox_headers)
):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.UPSTOX_API_BASE_URL}/trade/profit-loss/charges?segment={segment}&financial_year={financial_year}",
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

# ─────────────────────────────────────────────────────────────────
# MARKET INFORMATION — Gainers / Losers / Most Active
# ─────────────────────────────────────────────────────────────────
@router.get("/market-info")
async def get_market_info(
    info_type: str = Query("gainers", description="gainers | losers | 52week_high | 52week_low | volume_shockers"),
    data_type: str = Query("cash_leaders"),
    headers: dict = Depends(get_upstox_headers)
):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.UPSTOX_API_BASE_URL}/market-information/{info_type}?data_type={data_type}",
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

# ─────────────────────────────────────────────────────────────────
# FULL MARKET QUOTES — Bulk LTP for multiple instruments
# ─────────────────────────────────────────────────────────────────
@router.get("/ltp")
async def get_ltp(
    instrument_key: str = Query(..., description="Comma-separated instrument keys"),
    headers: dict = Depends(get_upstox_headers)
):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.UPSTOX_API_BASE_URL}/market-quote/ltp?instrument_key={instrument_key}",
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

# ─────────────────────────────────────────────────────────────────
# GTT ORDERS — Good Till Triggered Order Management
# ─────────────────────────────────────────────────────────────────
@router.get("/gtt-orders")
async def get_gtt_orders(headers: dict = Depends(get_upstox_headers)):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.UPSTOX_API_BASE_URL}/order/gtt/list",
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

# ─────────────────────────────────────────────────────────────────
# BROKERAGE CALCULATOR — Get estimated charges before placing order
# ─────────────────────────────────────────────────────────────────
@router.get("/brokerage")
async def get_brokerage(
    instrument_key: str,
    quantity: int,
    product: str = Query("D"),
    transaction_type: str = Query("BUY"),
    price: float = Query(0),
    headers: dict = Depends(get_upstox_headers)
):
    async with httpx.AsyncClient() as client:
        params = (
            f"instrument_token={instrument_key}"
            f"&quantity={quantity}"
            f"&product={product}"
            f"&transaction_type={transaction_type}"
            f"&price={price}"
        )
        response = await client.get(
            f"{settings.UPSTOX_API_BASE_URL}/charges/brokerage?{params}",
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

# ─────────────────────────────────────────────────────────────────
# OPTION EXPIRY DATES — Get list of expiry dates for a symbol
# ─────────────────────────────────────────────────────────────────
@router.get("/option-expiry")
async def get_option_expiry(
    instrument_key: str,
    headers: dict = Depends(get_upstox_headers)
):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.UPSTOX_API_BASE_URL}/option/contract?instrument_key={instrument_key}",
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

# ─────────────────────────────────────────────────────────────────
# MARGIN CALCULATOR — Calculate margin for order before placing
# ─────────────────────────────────────────────────────────────────
class MarginRequest(BaseModel):
    orders: list

@router.post("/margin")
async def calculate_margin(
    body: MarginRequest,
    headers: dict = Depends(get_upstox_headers)
):
    headers["Content-Type"] = "application/json"
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.UPSTOX_API_BASE_URL}/charges/margin",
            headers=headers,
            json=body.model_dump()
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

# ─────────────────────────────────────────────────────────────────
# POSITION CONVERSION — Convert Intraday to Delivery (MIS→CNC)
# ─────────────────────────────────────────────────────────────────
class ConvertPositionRequest(BaseModel):
    instrument_token: str
    transaction_type: str   # BUY or SELL
    quantity: int
    old_product: str        # "D" (delivery) or "I" (intraday)
    new_product: str

@router.put("/positions/convert")
async def convert_position(
    body: ConvertPositionRequest,
    headers: dict = Depends(get_upstox_headers)
):
    headers["Content-Type"] = "application/json"
    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{settings.UPSTOX_API_BASE_URL}/portfolio/convert-position",
            headers=headers,
            json=body.model_dump()
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

