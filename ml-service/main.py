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
Historial de valor total de cartera (multiactivo)
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
    print(f"From date: {from_date}")
    
    yf_symbols = []
    for i, sym in enumerate(symbol_list):
        atype = type_list[i] if i < len(type_list) else "stock"
        yf_sym = f"{sym.upper()}-USD" if atype == "crypto" else sym.upper()
        yf_symbols.append(yf_sym)

    end_date = datetime.today()

    if from_date:
        try:
            start_date = datetime.strptime(from_date, "%Y-%m-%d")
        except Exception:
            start_date = datetime.today() - timedelta(days=30)
    elif date_list:
        min_date = datetime.today()
        for purchase_date in date_list:
            if purchase_date:
                try:
                    inv_date = datetime.strptime(purchase_date, "%Y-%m-%d")
                    if inv_date < min_date:
                        min_date = inv_date
                except Exception:
                    pass
        start_date = min_date - timedelta(days=5)
    else:
        start_date = datetime.today() - timedelta(days=30)
    
    print(f"Start date: {start_date.date()}, End date: {end_date.date()}")

    try:
        portfolio = Tickers(" ".join(yf_symbols))
        data = portfolio.history(start=start_date.strftime("%Y-%m-%d"), 
                                  end=end_date.strftime("%Y-%m-%d"))
        
        if data.empty:
            print("Data is empty")
            return {"data": []}
        
        closes = data['Close']

        if isinstance(closes, pd.Series):
            closes = closes.to_frame(name=yf_symbols[0])
        
        portfolio_values = pd.Series(0.0, index=closes.index)
        
        for i, (sym, qty) in enumerate(zip(yf_symbols, quantity_list)):
            if sym not in closes.columns:
                print(f"Symbol {sym} not found in columns: {list(closes.columns)}")
                continue

            col = closes[sym].copy()

            if i < len(date_list) and date_list[i]:
                try:
                    purchase_dt = datetime.strptime(date_list[i], "%Y-%m-%d")
                    if col.index.tzinfo is not None:
                        import pytz
                        purchase_dt = pytz.utc.localize(purchase_dt)
                    col = col[col.index >= purchase_dt]
                    print(f"  {sym}: purchase_date = {date_list[i]}, qty = {qty}, puntos = {len(col)}")
                except Exception as e:
                    print(f"  {sym}: error en purchase_date: {e}")

            portfolio_values = portfolio_values.add(col * qty, fill_value=0)
        
        portfolio_values = portfolio_values[portfolio_values > 0]
        
        if portfolio_values.empty:
            print("Portfolio values empty")
            return {"data": []}
        
        print(f"Portfolio values: {len(portfolio_values)} points")
        print(f"First value: {portfolio_values.iloc[0]:.2f} on {portfolio_values.index[0].date()}")
        print(f"Last value: {portfolio_values.iloc[-1]:.2f}")
        
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

"""
Precio historico para una fecha exacta
"""
@app.get("/historical-price/{symbol}")
def get_historical_price(
    symbol: str,
    date: str,
    asset_type: str = "stock",
    convert_to_eur: bool = True
):
    import re
    from datetime import datetime, timedelta

    # Valida el formato basico del simbolo
    if not re.match(r"^[A-Za-z0-9.\-]{1,20}$", symbol):
        raise HTTPException(status_code=422, detail="Simbolo invalido")

    # Intenta convertir la fecha al formato esperado
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=422, detail="Formato de fecha invalido. Usa YYYY-MM-DD")

    # Normaliza el simbolo a mayusculas
    clean_symbol = symbol.upper()

    # Busca unos dias antes por si no hubo mercado ese dia
    start_date = (target_date - timedelta(days=7)).strftime("%Y-%m-%d")

    # Suma un dia para incluir bien el rango final
    end_date = (target_date + timedelta(days=1)).strftime("%Y-%m-%d")

    # Descarga datos de Yahoo Finance
    def download_data(ticker, start=None, end=None, period=None):
        df = yf.download(
            ticker,
            start=start,
            end=end,
            period=period,
            progress=False,
            auto_adjust=False
        )

        # Corrige columnas multiples que a veces devuelve yfinance
        if not df.empty and isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        # Devuelve el dataframe ya limpio
        return df

    # Saca el ultimo precio de cierre disponible hasta una fecha limite
    def get_close_price(df, limit_date):
        # Si no hay datos o no existe Close no seguimos
        if df.empty or "Close" not in df.columns:
            return None

        # Filtra solo fechas iguales o anteriores a la pedida
        df = df[df.index.strftime("%Y-%m-%d") <= limit_date.strftime("%Y-%m-%d")]

        # Si no queda nada despues del filtro no hay precio
        if df.empty:
            return None

        # Quita posibles valores nulos en el cierre
        close_values = df["Close"].dropna()

        # Si no hay cierres validos devolvemos None
        if close_values.empty:
            return None

        # Usa el cierre mas cercano hacia atras
        return float(close_values.iloc[-1])

    # Comprueba rapido si un ticker devuelve precios utiles
    def has_price_data(ticker):
        try:
            df = download_data(ticker, period="7d")

            # Solo vale si encontramos un cierre usable
            return get_close_price(df, target_date) is not None
        except Exception:
            # Si falla la descarga tratamos el ticker como invalido
            return False

    # Intenta encontrar el simbolo correcto de crypto en Yahoo
    def get_crypto_symbol(user_symbol):
        # Primero prueba el formato mas comun
        normal_symbol = f"{user_symbol}-USD"

        # Si existe y tiene datos lo usamos
        if has_price_data(normal_symbol):
            return normal_symbol

        try:
            # Busca resultados relacionados en Yahoo
            search = yf.Search(user_symbol, max_results=10)

            # Recorre los resultados encontrados
            for item in search.quotes:
                quote_symbol = item.get("symbol", "")
                quote_type = item.get("quoteType", "")

                # Solo nos interesan cryptos terminadas en USD
                if quote_type == "CRYPTOCURRENCY" and quote_symbol.endswith("-USD"):
                    # Confirma que el ticker encontrado tiene precio real
                    if has_price_data(quote_symbol):
                        return quote_symbol
        except Exception:
            # Si la busqueda falla seguimos con None
            pass

        # Si no se encontro nada devolvemos None
        return None

    try:
        # Para crypto resolvemos el ticker real de Yahoo
        yahoo_symbol = get_crypto_symbol(clean_symbol) if asset_type == "crypto" else clean_symbol

        # Si no hay ticker valido devolvemos 404
        if not yahoo_symbol:
            raise HTTPException(status_code=404, detail="No se encontro un ticker valido")

        # Descarga datos del activo en torno a la fecha pedida
        asset_data = download_data(yahoo_symbol, start=start_date, end=end_date)

        # Busca el cierre mas cercano hacia atras
        price = get_close_price(asset_data, target_date)

        # Si no vino nada de Yahoo devolvemos error
        if asset_data.empty:
            raise HTTPException(status_code=404, detail="Sin datos para esa fecha")

        # Si no encontramos cierre util devolvemos error
        if price is None:
            raise HTTPException(status_code=404, detail="Sin datos cercanos a esa fecha")

        # Por defecto Yahoo devuelve este precio en USD
        currency = "USD"

        # Convierte a EUR si el cliente lo pide
        if convert_to_eur:
            # Descarga el tipo de cambio EURUSD
            fx_data = download_data("EURUSD=X", start=start_date, end=end_date)

            # Busca el cambio mas cercano hacia atras
            exchange_rate = get_close_price(fx_data, target_date)

            # Solo convierte si el cambio existe y es valido
            if exchange_rate and exchange_rate > 0:
                price = price / exchange_rate
                currency = "EUR"

        # Devuelve la respuesta final ya redondeada
        return {
            "symbol": clean_symbol,
            "yahoo_symbol": yahoo_symbol,
            "requested_date": date,
            "price": round(price, 8) if asset_type == "crypto" else round(price, 4),
            "currency": currency
        }

    # Reenvia errores HTTP controlados tal cual
    except HTTPException:
        raise

    # Convierte cualquier otro error en 500
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))