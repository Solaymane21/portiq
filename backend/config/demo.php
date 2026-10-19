<?php

// Datos de la cuenta demo publica. Los usa el comando demo:seed.
// Los precios estan en USD (igual que los que devuelve el market-service)
// y las fechas en "dias atras" para que la demo siempre parezca reciente.

return [

    'email' => env('DEMO_EMAIL', 'demo@portiq.app'),
    'name'  => 'Demo',

    'symbols' => [
        'AAPL' => ['name' => 'Apple Inc.',            'asset_type' => 'stock',  'api_id' => 'AAPL',     'image_url' => null],
        'MSFT' => ['name' => 'Microsoft Corporation', 'asset_type' => 'stock',  'api_id' => 'MSFT',     'image_url' => null],
        'NVDA' => ['name' => 'NVIDIA Corporation',    'asset_type' => 'stock',  'api_id' => 'NVDA',     'image_url' => null],
        'AMZN' => ['name' => 'Amazon.com, Inc.',      'asset_type' => 'stock',  'api_id' => 'AMZN',     'image_url' => null],
        'TSLA' => ['name' => 'Tesla, Inc.',           'asset_type' => 'stock',  'api_id' => 'TSLA',     'image_url' => null],
        'SPY'  => ['name' => 'SPDR S&P 500 ETF Trust','asset_type' => 'stock',  'api_id' => 'SPY',      'image_url' => null],
        'BTC'  => ['name' => 'Bitcoin',  'asset_type' => 'crypto', 'api_id' => 'bitcoin',  'image_url' => 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png'],
        'ETH'  => ['name' => 'Ethereum', 'asset_type' => 'crypto', 'api_id' => 'ethereum', 'image_url' => 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png'],
        'SOL'  => ['name' => 'Solana',   'asset_type' => 'crypto', 'api_id' => 'solana',   'image_url' => 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png'],
    ],

    // Cada operacion: [tipo, cantidad, precio, dias atras]. La primera compra crea la posicion
    'portfolios' => [
        [
            'name' => 'Largo plazo',
            'is_default' => true,
            'is_public' => false,
            'positions' => [
                'AAPL' => [['buy', 15, 172.50, 350], ['buy', 10, 189.20, 220], ['buy', 5, 214.80, 90]],
                'MSFT' => [['buy', 8, 405.10, 330], ['buy', 4, 418.60, 160]],
                'NVDA' => [['buy', 40, 88.40, 300], ['buy', 20, 118.90, 180], ['sell', 15, 139.70, 60]],
                'AMZN' => [['buy', 12, 178.30, 280], ['buy', 8, 195.40, 120]],
                'SPY'  => [['buy', 10, 512.00, 360], ['buy', 5, 548.30, 200], ['buy', 5, 571.90, 45]],
            ],
        ],
        [
            'name' => 'Crypto',
            'is_default' => false,
            'is_public' => true,
            'positions' => [
                'BTC' => [['buy', 0.08, 61200, 340], ['buy', 0.05, 68400, 210], ['sell', 0.03, 94500, 75]],
                'ETH' => [['buy', 1.5, 3050, 320], ['buy', 1.0, 2580, 150]],
                'SOL' => [['buy', 20, 142.50, 260], ['buy', 15, 168.00, 100]],
            ],
        ],
        [
            'name' => 'Tecnologicas',
            'is_default' => false,
            'is_public' => false,
            'positions' => [
                'TSLA' => [['buy', 10, 182.60, 240], ['buy', 6, 245.10, 110]],
                'NVDA' => [['buy', 25, 105.30, 200]],
            ],
        ],
    ],

    'favorites' => ['AAPL', 'TSLA', 'BTC', 'ETH', 'SPY'],

    // [simbolo, condicion, precio objetivo, activa]
    'alerts' => [
        ['AAPL', 'above', 260, true],
        ['BTC',  'below', 80000, true],
        ['NVDA', 'above', 200, true],
        ['ETH',  'above', 2000, false],
    ],

    // La primera notificacion se asocia a la alerta inactiva (ya disparada)
    'notifications' => [
        ['title' => 'Alerta disparada: ETH', 'message' => 'Ethereum ha superado tu precio objetivo de 2.000,00 $', 'alert' => 'ETH'],
        ['title' => 'Bienvenido a la demo de PortIQ', 'message' => 'Explora las carteras, favoritos, alertas y el analisis de tu perfil inversor.', 'alert' => null],
    ],

    // 9 respuestas entre 0 y 3 (perfil moderado)
    'investor_profile_answers' => [2, 1, 2, 2, 1, 2, 1, 2, 2],
];
