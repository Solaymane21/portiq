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

"""
Precio actual de un ticker. ticker.info suele estar bloqueado por Yahoo desde
IPs de servidores en la nube, así que si falla se usa fast_info (API de charts)
"""
def get_quote(ticker):
    try:
        info = ticker.info
        price = info.get("currentPrice") or info.get("regularMarketPrice")
        if price is not None:
            return {
                "name":     info.get("longName", ""),
                "price":    price,
                "currency": info.get("currency", "USD"),
                "change":   info.get("regularMarketChangePercent"),
            }
    except Exception:
        pass

    fast = ticker.fast_info
    price = fast.last_price
    prev = fast.previous_close
    return {
        "name":     "",
        "price":    price,
        "currency": fast.currency or "USD",
        "change":   (price - prev) / prev * 100 if price and prev else None,
    }


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
            quote = get_quote(yf.Ticker(yf_symbol))

            results.append({
                "symbol": symbol.upper(),  # devolver símbolo limpio sin -USD
                **quote,
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
            quote = get_quote(yf.Ticker(symbol.upper()))
            price = quote["price"]

            if price is None:
                results.append({"symbol": symbol.upper(), "error": "Sin precio disponible"})
                continue

            position_value = round(price*quantity, 2)
            total_value += position_value

            results.append({
                "symbol": symbol.upper(),
                "name":            quote["name"],
                "price":           price,
                "quantity":        quantity,
                "position_value":  position_value,
                "change":          quote["change"],
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

    # Validamos el simbolo para evitar entradas raras
    if not re.match(r"^[A-Za-z0-9.\-]{1,20}$", symbol):
        raise HTTPException(status_code=422, detail="Simbolo invalido")

    # Intentamos convertir la fecha al formato esperado
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=422, detail="Formato de fecha invalido. Usa YYYY-MM-DD")

    # Solo permitimos stock o crypto
    asset_type = asset_type.lower().strip()
    if asset_type not in ("stock", "crypto"):
        raise HTTPException(status_code=422, detail="asset_type debe ser 'stock' o 'crypto'")

    # Normalizamos el simbolo a mayusculas
    clean_symbol = symbol.upper()

    # Buscamos algunos dias antes por si no hubo mercado ese dia
    start_date = (target_date - timedelta(days=7)).strftime("%Y-%m-%d")

    # Sumamos un dia porque yfinance usa end exclusivo
    end_date = (target_date + timedelta(days=1)).strftime("%Y-%m-%d")

    def download_data(ticker, start=None, end=None, period=None):
        # Descargamos datos diarios desde Yahoo
        df = yf.download(
            ticker,
            start=start,
            end=end,
            period=period,
            interval="1d",
            progress=False,
            auto_adjust=False,
            threads=False
        )

        # Si no llega nada devolvemos un dataframe vacio
        if df is None or df.empty:
            return pd.DataFrame()

        # Si vienen columnas dobles nos quedamos con la primera capa
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        # Convertimos el indice a fechas de pandas
        df.index = pd.to_datetime(df.index)

        # Quitamos timezone si existe para comparar mejor las fechas
        try:
            if getattr(df.index, "tz", None) is not None:
                df.index = df.index.tz_localize(None)
        except Exception:
            pass

        # Ordenamos por si acaso
        return df.sort_index()

    def get_close_price(df, limit_date):
        # Si no hay datos o no hay columna Close no seguimos
        if df.empty or "Close" not in df.columns:
            return None

        # Filtramos hasta la fecha pedida incluida
        df = df[df.index <= pd.Timestamp(limit_date)]

        # Si no queda nada no hay precio util
        if df.empty:
            return None

        # Quitamos cierres vacios
        close_values = df["Close"].dropna()

        # Si sigue vacio devolvemos None
        if close_values.empty:
            return None

        # Cogemos el cierre mas cercano hacia atras
        return float(close_values.iloc[-1])

    def ticker_has_data(ticker):
        # Aqui solo comprobamos si el ticker existe y devuelve precios
        try:
            df = download_data(ticker, period="1mo")

            # Si esta vacio no sirve
            if df.empty:
                return False

            # Si no tiene Close no sirve
            if "Close" not in df.columns:
                return False

            # Si no hay cierres reales no sirve
            if df["Close"].dropna().empty:
                return False

            return True
        except Exception:
            return False

    def resolve_crypto_symbol(user_symbol):
        # Probamos primero el formato normal de Yahoo
        normal_symbol = f"{user_symbol}-USD"

        # Si existe lo devolvemos directamente
        if ticker_has_data(normal_symbol):
            return normal_symbol

        # Si no, intentamos encontrarlo con el buscador
        try:
            search = yf.Search(user_symbol, max_results=10)

            # Recorremos los resultados devueltos por Yahoo
            for item in search.quotes:
                quote_symbol = (item.get("symbol") or "").upper()
                quote_type = (item.get("quoteType") or "").upper()

                # Nos quedamos solo con cryptos en USD
                if quote_type == "CRYPTOCURRENCY" and quote_symbol.endswith("-USD"):
                    # Confirmamos que ese ticker si devuelve precios
                    if ticker_has_data(quote_symbol):
                        return quote_symbol
        except Exception:
            pass

        # Si no encontramos nada devolvemos None
        return None

    try:
        # Para crypto resolvemos el ticker real de Yahoo
        yahoo_symbol = resolve_crypto_symbol(clean_symbol) if asset_type == "crypto" else clean_symbol

        # Si no existe un ticker valido devolvemos 404
        if not yahoo_symbol:
            raise HTTPException(status_code=404, detail="No se encontro un ticker valido")

        # Descargamos los datos alrededor de la fecha pedida
        data = download_data(yahoo_symbol, start=start_date, end=end_date)

        # Si Yahoo no devuelve nada no hay datos para ese rango
        if data.empty:
            raise HTTPException(status_code=404, detail="Sin datos para esa fecha")

        # Buscamos el ultimo cierre disponible hasta la fecha objetivo
        price = get_close_price(data, target_date)

        # Si no encontramos cierre util devolvemos error
        if price is None:
            raise HTTPException(status_code=404, detail="Sin cierre disponible cerca de esa fecha")

        # El precio base lo tratamos como USD
        currency = "USD"

        # Si nos piden EUR intentamos convertir el precio
        if convert_to_eur:
            # Descargamos el cambio EURUSD del mismo rango
            fx_data = download_data("EURUSD=X", start=start_date, end=end_date)

            # Buscamos el cambio mas cercano hacia atras
            fx_rate = get_close_price(fx_data, target_date)

            # Solo convertimos si el cambio existe y es valido
            if fx_rate and fx_rate > 0:
                price = price / fx_rate
                currency = "EUR"

        # Devolvemos la respuesta final ya redondeada
        return {
            "symbol": clean_symbol,
            "yahoo_symbol": yahoo_symbol,
            "requested_date": date,
            "price": round(price, 8) if asset_type == "crypto" else round(price, 4),
            "currency": currency
        }

    # Reenviamos tal cual los errores HTTP controlados
    except HTTPException:
        raise

    # Cualquier otro fallo lo convertimos en error 500
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inesperado: {str(e)}")