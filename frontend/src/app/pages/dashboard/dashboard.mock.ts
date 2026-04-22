import { Portfolio } from '../../models/portfolio.model';

export const PORTFOLIOS_MOCK: Portfolio[] = [
  {
    id: 1,
    name: 'Cartera Principal',
    totalValue: 100000,
    totalValueUSD: 108500,
    totalPositions: 12,
    profitLoss: -4250,
    symbol: 'AAPL',
    allocation: [
      { label: 'Acciones',      percent: 70, color: '#F97316', colorClass: 'bg-orange-500', textClass: 'text-[#F97316]' },
      { label: 'Criptomonedas', percent: 30, color: '#C2410C', colorClass: 'bg-orange-700', textClass: 'text-[#C2410C]' }
    ],
    positions: [
      { ticker: 'AAPL', name: 'Apple Inc.',  price: '$182.50', change: '+1.24%', positive: true },
      { ticker: 'MSFT', name: 'Microsoft',   price: '$415.20', change: '+0.87%', positive: true },
      { ticker: 'BTC',  name: 'Bitcoin',     price: '$61.200', change: '-2.10%', positive: false },
    ]
  },
  {
    id: 2,
    name: 'Cartera Growth',
    totalValue: 47320,
    totalValueUSD: 51342,
    totalPositions: 7,
    profitLoss: 9320,
    symbol: 'NVDA',
    allocation: [
      { label: 'Acciones',      percent: 85, color: '#EA580C', colorClass: 'bg-orange-500', textClass: 'text-[#EA580C]' },
      { label: 'Criptomonedas', percent: 15, color: '#92400e', colorClass: 'bg-orange-800', textClass: 'text-neutral-400' }
    ],
    positions: [
      { ticker: 'NVDA', name: 'NVIDIA',   price: '$851.30', change: '+3.40%', positive: true },
      { ticker: 'TSLA', name: 'Tesla',    price: '$178.50', change: '-1.20%', positive: false },
      { ticker: 'SOL',  name: 'Solana',   price: '$142.80', change: '+5.60%', positive: true },
    ]
  },
  {
    id: 3,
    name: 'Cripto Portfolio',
    totalValue: 18540,
    totalValueUSD: 20115,
    totalPositions: 5,
    profitLoss: -1460,
    symbol: 'BTC-USD',
    allocation: [
      { label: 'Bitcoin',  percent: 50, color: '#EA580C', colorClass: 'bg-orange-500', textClass: 'text-[#EA580C]' },
      { label: 'Altcoins', percent: 50, color: '#92400e', colorClass: 'bg-orange-800', textClass: 'text-neutral-400' }
    ],
    positions: [
      { ticker: 'BTC',  name: 'Bitcoin',    price: '$61.200', change: '-2.10%', positive: false },
      { ticker: 'ETH',  name: 'Ethereum',   price: '$3.210',  change: '-1.80%', positive: false },
      { ticker: 'SOL',  name: 'Solana',     price: '$142.80', change: '+5.60%', positive: true },
      { ticker: 'AVAX', name: 'Avalanche',  price: '$28.40',  change: '+6.50%', positive: true },
    ]
  }
];
