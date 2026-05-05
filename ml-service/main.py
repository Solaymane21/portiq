import yfinance as yf
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


# """
# Buscar unico simbolo
# """
# @app.get("/search/{symbol}")
# def search(symbol: str):
    
#     if not re.match(r'^[A-Za-z0-9.\-]{1,10}$', symbol):
#         raise HTTPException(status_code=422, detail="Símbolo inválido")

#     ticker = yf.Ticker(symbol.upper())
#     info = ticker.info

#     if not info.get("regularMarketPrice") and not info.get("currentPrice"):
#         raise HTTPException(status_code=404, detail="Ticker no encontrado")

#     return {
#         "symbol":   symbol.upper(),
#         "name":     info.get("longName", ""),
#         "price":    info.get("currentPrice") or info.get("regularMarketPrice"),
#         "currency": info.get("currency", "USD"),
#         "type":     info.get("quoteType", ""),
#         "sector":   info.get("sector", ""),
#         "logo":     info.get("logo_url", ""),
#     }

@app.get("/search/{query}")
def search(query: str):
    # Permite letras, números, puntos, guiones y espacios (para nombres)
    if not re.match(r'^[A-Za-z0-9.\-\s]{1,50}$', query):
        raise HTTPException(status_code=422, detail="Búsqueda inválida")

    try:
        results = yf.Search(query, max_results=8, news_count=0)
        quotes = results.quotes
    except Exception:
        raise HTTPException(status_code=503, detail="Error al conectar con Yahoo Finance")

    if not quotes:
        return {"data": [], "status": "ok"}

    data = [
        {
            "symbol":          q.get("symbol", ""),
            "instrument_name": q.get("longname") or q.get("shortname", ""),
            "exchange":        q.get("exchange", ""),
            "instrument_type": q.get("quoteType", ""),
            "country":         "",
            "currency":        q.get("currency", ""),
        }
        for q in quotes
        if q.get("symbol")
    ]

    return {"data": data, "status": "ok"}

"""
Buscar varios precios
"""

@app.get("/prices")
def getPrices(symbols: str, asset_types: str = ""):
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    type_list = [t.strip() for t in asset_types.split(",") if t.strip()]

    if not symbol_list:
        raise HTTPException(status_code=400, detail="No se enviaron símbolos")

    if len(symbol_list) > 20:
        raise HTTPException(status_code=400, detail="Máximo 20 símbolos por consulta")

    results = []

    for i, symbol in enumerate(symbol_list):
        if not re.match(r'^[A-Za-z0-9.\-]{1,10}$', symbol):
            results.append({"symbol": symbol, "error": "Símbolo inválido"})
            continue

        asset_type = type_list[i] if i < len(type_list) else "stock"
        
        # Añadir sufijo -USD para crypto
        yf_symbol = f"{symbol.upper()}-USD" if asset_type == "crypto" else symbol.upper()

        try:
            ticker = yf.Ticker(yf_symbol)
            info = ticker.info
            price = info.get("currentPrice") or info.get("regularMarketPrice")

            results.append({
                "symbol": symbol.upper(),  # devolver símbolo limpio sin -USD
                "name": info.get("longName", ""),
                "price": price,
                "currency": info.get("currency", "USD"),
                "change": info.get("regularMarketChangePercent"),
            })

        except Exception:
            results.append({
                "symbol": symbol.upper(),
                "error": "No se pudo obtener el precio"
            })

    return {
        "total": len(results),
        "results": results
    }

"""
Recoger varios precios y calcular valor total con posiciones
"""

@app.get("/portfolio/value")

def portfolio_value(positions: str):

    position_list = [p.strip() for p in positions.split(",") if p.strip()]

    if not position_list:
        raise HTTPException(status_code=400, detail="No se han enviado posiciones")

    results =[]

    total_value = 0.0

    for position in position_list:

        try:
            symbol, quantity = position.split(":")
            quantity = float(quantity)
        except ValueError:
            results.append({"position": position, "error": "Formato inválido, usa SYMBOL:CANTIDAD"})
            continue

        if not re.match(r'^[A-Za-z0-9.\-]{1,10}$', symbol):
            results.append({"symbol": symbol, "error": "Símbolo inválido"})
            continue

        try:
            ticker= yf.Ticker(symbol.upper())
            info = ticker.info
            price = info.get("currentPrice") or info.get("regularMarketPrice")

            if price is None:
                results.append({"symbol": symbol.upper(), "error": "Sin precio disponible"})
                continue

            position_value = round(price*quantity, 2)
            total_value += position_value

            results.append({
                "symbol": symbol.upper(),
                "name":            info.get("longName", ""),
                "price":           price,
                "quantity":        quantity,
                "position_value":  position_value,
                "change":          info.get("regularMarketChangePercent"),
            })

        except Exception:
            results.append({
                "symbol": symbol.upper(),
                "error": "No se pudo obtener el precio"
            })

    return {
            "total_value": round(total_value, 2),   
            "currency":    "USD",
            "positions":   len(results),
            "results":     results
    }
"""
Historial de precios para gráfica
"""
@app.get("/history/{symbol}")
def get_history(symbol: str, period: str = "1D", asset_type: str = "stock"):

    if not re.match(r'^[A-Za-z0-9.\-]{1,10}$', symbol):
        raise HTTPException(status_code=422, detail="Símbolo inválido")

    # Sufijo -USD para crypto
    yf_symbol = f"{symbol.upper()}-USD" if asset_type == "crypto" else symbol.upper()

    period_map = {
        "1D": ("1d",  "5m"),
        "1W": ("5d",  "30m"),
        "1M": ("1mo", "1d"),
        "1Y": ("1y",  "1wk"),
    }

    yf_period, yf_interval = period_map.get(period, ("5d", "5m"))

    try:
        df = yf.download(
            yf_symbol,
            period=yf_period,
            interval=yf_interval,
            progress=False
        )

        if df.empty:
            raise HTTPException(status_code=404, detail="Sin datos históricos")

        df.columns = df.columns.get_level_values(0)

        if period == "1D":
            last_day = df.index[-1].date()
            df = df[df.index.date == last_day]

        data = [
            {
                "x": int(ts.timestamp() * 1000),
                "y": round(float(row["Close"]), 2)
            }
            for ts, row in df.iterrows()
        ]

        return {
            "symbol": symbol.upper(),
            "period": period,
            "interval": yf_interval,
            "data": data
            
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        