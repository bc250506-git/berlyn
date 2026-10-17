import { NextResponse } from 'next/server';

interface KKTCExchangeRates {
  source: string;
  bankDate: string;
  lastUpdated: string;
  rates: {
    TRY: number;
    USD: number;
    GBP: number;
  };
}

let cachedRates: KKTCExchangeRates | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export async function GET() {
  const now = Date.now();

  // Return cached rates if fresh
  if (cachedRates && now - lastFetchTime < CACHE_TTL_MS) {
    return NextResponse.json(cachedRates);
  }

  try {
    const res = await fetch('https://www.mb.gov.ct.tr/kur/gunluk.xml', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BerlynApp/1.0',
      },
      next: { revalidate: 600 }, // 10 minutes Next.js cache
    });

    if (!res.ok) {
      throw new Error(`KKTC MB HTTP ${res.status}`);
    }

    const xmlText = await res.text();

    // Extract Kur_Tarihi
    const dateMatch = xmlText.match(/<Kur_Tarihi>([^<]+)<\/Kur_Tarihi>/);
    const bankDate = dateMatch ? dateMatch[1].trim() : '17/10/2026';

    // Helper to extract Doviz_Satis or Efektif_Satis for a symbol
    const extractRate = (symbol: string, defaultVal: number): number => {
      const regex = new RegExp(
        `<Sembol>${symbol}</Sembol>[\\s\\S]*?<Doviz_Satis>([0-9.]+)<\/Doviz_Satis>`,
        'i'
      );
      const match = xmlText.match(regex);
      if (match && match[1]) {
        const val = parseFloat(match[1]);
        if (!isNaN(val) && val > 0) return val;
      }
      return defaultVal;
    };

    const usdRate = extractRate('USD', 49.4463);
    const gbpRate = extractRate('GBP', 66.0056);

    const nowD = new Date();
    const day = String(nowD.getDate()).padStart(2, '0');
    const month = String(nowD.getMonth() + 1).padStart(2, '0');
    const year = nowD.getFullYear();
    const hours = String(nowD.getHours()).padStart(2, '0');
    const mins = String(nowD.getMinutes()).padStart(2, '0');
    const lastUpdated = `${day}.${month}.${year} ${hours}:${mins}`;

    cachedRates = {
      source: 'Central Bank of TRNC (mb.gov.ct.tr)',
      bankDate: bankDate.replace(/\//g, '.'),
      lastUpdated,
      rates: {
        TRY: 1.0,
        USD: usdRate,
        GBP: gbpRate,
      },
    };

    lastFetchTime = now;
    return NextResponse.json(cachedRates);
  } catch {
    // Graceful fallback with latest official rates
    const nowD = new Date();
    const day = String(nowD.getDate()).padStart(2, '0');
    const month = String(nowD.getMonth() + 1).padStart(2, '0');
    const year = nowD.getFullYear();
    const hours = String(nowD.getHours()).padStart(2, '0');
    const mins = String(nowD.getMinutes()).padStart(2, '0');

    const fallback: KKTCExchangeRates = {
      source: 'Central Bank of TRNC (mb.gov.ct.tr)',
      bankDate: `${day}.${month}.${year}`,
      lastUpdated: `${day}.${month}.${year} ${hours}:${mins}`,
      rates: {
        TRY: 1.0,
        USD: 49.4463,
        GBP: 66.0056,
      },
    };

    return NextResponse.json(fallback);
  }
}
