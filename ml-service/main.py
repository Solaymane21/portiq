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


"""
Buscar unico simbolo
"""
@app.get("/search/{symbol}")
def search(symbol: str):
    
    if not re.match(r'^[A-Za-z0-9.\-]{1,10}$', symbol):
        raise HTTPException(status_code=422, detail="Símbolo inválido")

    ticker = yf.Ticker(symbol.upper())
    info = ticker.info

    if not info.get("regularMarketPrice") and not info.get("currentPrice"):
        raise HTTPException(status_code=404, detail="Ticker no encontrado")

    return {
        "symbol":   symbol.upper(),
        "name":     info.get("longName", ""),
        "price":    info.get("currentPrice") or info.get("regularMarketPrice"),
        "currency": info.get("currency", "USD"),
        "type":     info.get("quoteType", ""),
        "sector":   info.get("sector", ""),
        "logo":     info.get("logo_url", ""),
    }

"""
Buscar varios precios
"""

@app.get("/prices")

def getPrices(symbols: str):

        symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]

        if not symbol_list:
            raise HTTPException(status_code=400, detail="No se enviaron símbolos")

        if len(symbol_list) > 20:
            raise HTTPException(status_code=400, detail="Máximo 20 símbolos por consulta")

        results = []

        for symbol in symbol_list:
            if not re.match(r'^[A-Za-z0-9.\-]{1,10}$', symbol):
                results.append({"symbol": symbol, "error": "Símbolo inválido"})
                continue
            
            try:
                ticker = yf.Ticker(symbol.upper())
                info = ticker.info
                price = info.get("currentPrice") or info.get("regularMarketPrice")

                results.append({
                    "symbol": symbol.upper(),
                    "name": info.get("longName", ""),
                    "price":    price,
                    "currency": info.get("currency", "USD"),
                    "change":   info.get("regularMarketChangePercent"),
                })

            except Exception:
                results.append({
                    "symbol": symbol.upper(),
                    "error":  "No se pudo obtener el precio"
            })

        return {
            "total":   len(results),
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