import yfinance as yf
from yfinance import Tickers
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import pandas as pd

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
Precio histórico para una fecha exacta
"""
@app.get("/historical-price/{symbol}")
def get_historical_price(symbol: str, date: str, asset_type: str = "stock", convert_to_eur: bool = True):
    if not re.match(r'^[A-Za-z0-9.\-]{1,10}$', symbol):
        raise HTTPException(status_code=422, detail="Símbolo inválido")

    yf_symbol = f"{symbol.upper()}-USD" if asset_type == "crypto" else symbol.upper()

    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
        start_date = target_date - timedelta(days=5)
        end_date = target_date + timedelta(days=1)

        # 1. Obtenemos el precio del activo
        df = yf.download(
            yf_symbol,
            start=start_date.strftime("%Y-%m-%d"),
            end=end_date.strftime("%Y-%m-%d"),
            progress=False
        )

        if df.empty:
            raise HTTPException(status_code=404, detail="Sin datos para esta fecha")

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df_filtered = df[df.index.strftime('%Y-%m-%d') <= target_date.strftime('%Y-%m-%d')]
        
        if df_filtered.empty:
            raise HTTPException(status_code=404, detail="Sin datos cercanos a esa fecha")

        price = float(df_filtered['Close'].iloc[-1])
        currency = "USD"

        # 2. Conversión a EUR (reemplaza a TwelveData)
        if convert_to_eur:
            # Descargamos el histórico del par Euro/Dólar
            fx_df = yf.download(
                "EURUSD=X",
                start=start_date.strftime("%Y-%m-%d"),
                end=end_date.strftime("%Y-%m-%d"),
                progress=False
            )
            
            if not fx_df.empty:
                if isinstance(fx_df.columns, pd.MultiIndex):
                    fx_df.columns = fx_df.columns.get_level_values(0)
                
                fx_filtered = fx_df[fx_df.index.strftime('%Y-%m-%d') <= target_date.strftime('%Y-%m-%d')]
                
                if not fx_filtered.empty:
                    exchange_rate = float(fx_filtered['Close'].iloc[-1])
                    # Fórmula: Precio (USD) / Tasa de cambio (EUR/USD) = Precio (EUR)
                    price = price / exchange_rate
                    currency = "EUR"

        return {
            "symbol": symbol.upper(),
            "requested_date": date,
            "price": round(price, 4),
            "currency": currency
        }

    except ValueError:
        raise HTTPException(status_code=422, detail="Formato de fecha inválido. Usa YYYY-MM-DD")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


"""
Historial de precios para gráfica
"""
@app.get("/history/{symbol}")
def get_history(symbol: str, period: str = "1D", asset_type: str = "stock"):

    if not re.match(r'^[A-Za-z0-9.\-]{1,10}$', symbol):
        raise HTTPException(status_code=422, detail="Símbolo inválido")

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

"""
Historial de valor total de cartera (multi-activo)
"""
@app.get("/portfolio-history")
def portfolio_history(
    symbols: str,
    quantities: str,
    asset_types: str = "",
    purchase_dates: str = "",
    purchase_prices: str = "",
    from_date: str = ""
):
    from yfinance import Tickers
    
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    quantity_list = [float(q) for q in quantities.split(",") if q.strip()]
    type_list = [t.strip() for t in asset_types.split(",") if t.strip()] if asset_types else []
    date_list = [d.strip() for d in purchase_dates.split(",") if d.strip()] if purchase_dates else []
    price_list = [float(p) for p in purchase_prices.split(",") if p.strip()] if purchase_prices else []

    if not symbol_list or not quantity_list:
        return {"data": []}
    
    print(f"=== Portfolio History ===")
    print(f"Symbols: {symbol_list}")
    print(f"Purchase dates: {date_list}")
    
    yf_symbols = []
    for i, sym in enumerate(symbol_list):
        atype = type_list[i] if i < len(type_list) else "stock"
        yf_sym = f"{sym.upper()}-USD" if atype == "crypto" else sym.upper()
        yf_symbols.append(yf_sym)

    end_date = datetime.today()
    
    min_date = datetime.today()
    for purchase_date in date_list:
        if purchase_date:
            try:
                inv_date = datetime.strptime(purchase_date, "%Y-%m-%d")
                if inv_date < min_date:
                    min_date = inv_date
            except:
                pass
    
    start_date = min_date - timedelta(days=30)
    
    print(f"Start date: {start_date.date()}, End date: {end_date.date()}")

    try:
        portfolio = Tickers(" ".join(yf_symbols))
        data = portfolio.history(start=start_date.strftime("%Y-%m-%d"), 
                                  end=end_date.strftime("%Y-%m-%d"))
        
        if data.empty:
            print("Data is empty")
            return {"data": []}
        
        closes = data['Close']
        
        portfolio_values = pd.Series(0.0, index=closes.index)
        
        for i, (sym, qty) in enumerate(zip(yf_symbols, quantity_list)):
            if sym not in closes.columns:
                print(f"Symbol {sym} not found")
                continue
            
            purchase_date = None
            if i < len(date_list) and date_list[i]:
                try:
                    purchase_date = datetime.strptime(date_list[i], "%Y-%m-%d")
                    print(f"  {sym}: purchase_date = {purchase_date.date()}, qty = {qty}")
                except:
                    pass
            
            if purchase_date is None:
                purchase_date = closes.index[0]
            
            for date in closes.index:
                if date >= purchase_date:
                    portfolio_values[date] += closes.loc[date, sym] * qty
        
        portfolio_values = portfolio_values[portfolio_values > 0]
        
        if portfolio_values.empty:
            print("Portfolio values empty")
            return {"data": []}
        
        print(f"Portfolio values: {len(portfolio_values)} points")
        print(f"First value: {portfolio_values.iloc[0]:.2f} on {portfolio_values.index[0].date()}")
        print(f"Last value: {portfolio_values.iloc[-1]:.2f}")
        
        # Formatear para ApexCharts
        result = [
            {"x": int(date.timestamp() * 1000), "y": round(float(val), 2)}
            for date, val in portfolio_values.items()
        ]
        
        return {"data": result}
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return {"data": []}