import { env } from '@/lib/env';

export type PolymarketMarketTick = {
  marketId: string;
  title: string;
  tag: string;
  bestBidYes: number;
  bestAskYes: number;
  liquidityUsd: number;
  volume5m: number;
  orderImbalance: number;
};

export interface PolymarketClient {
  fetchTicks: () => Promise<PolymarketMarketTick[]>;
}

const asNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

type SimplifiedToken = {
  token_id?: string;
  outcome?: string;
  price?: string | number;
};

type SimplifiedMarket = {
  condition_id?: string;
  question?: string;
  title?: string;
  event_title?: string;
  market_slug?: string;
  event_slug?: string;
  category?: string;
  tags?: string[];
  active?: boolean;
  closed?: boolean;
  archived?: boolean;
  accepting_orders?: boolean;
  end_date_iso?: string;
  game_start_time?: string;
  liquidity?: string | number;
  liquidity_num?: string | number;
  volume?: string | number;
  volume24hr?: string | number;
  tokens?: SimplifiedToken[];
};

type SimplifiedMarketsResponse = {
  data?: SimplifiedMarket[];
};

type GammaMarketLike = Record<string, unknown>;
type ClobMarketLike = Record<string, unknown>;
type ClobMarketsResponse = {
  data?: ClobMarketLike[];
  next_cursor?: string;
};

type BookLevel = {
  price?: string;
  size?: string;
};

type BookResponse = {
  bids?: BookLevel[];
  asks?: BookLevel[];
};

const slugToTitle = (slug?: string): string => {
  if (!slug) {
    return '';
  }
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeId = (value?: string): string => (value ?? '').trim().toLowerCase();

const firstNonEmpty = (...values: Array<string | undefined | null>): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const inferTagFromText = (input: string): string => {
  const text = input.toLowerCase();

  if (/(oil|wti|brent|opec|barrel|crude|energy prices|gasoline|natural gas)/.test(text)) {
    return 'oil';
  }
  if (/(finance|financial|bank|banking|credit|bond|yield|rate cut|rate hike|fed|fomc|treasury|s&p|nasdaq|dow|stocks?)/.test(text)) {
    return 'finance';
  }
  if (/(trending|viral|top story|breaking|headline)/.test(text)) {
    return 'trending';
  }
  if (/(election|president|senate|house|governor|prime minister|parliament|campaign|democrat|republican|trump|biden|vote)/.test(text)) {
    return 'politics';
  }
  if (/(nba|nfl|nhl|mlb|ncaab|ncaaf|fifa|ufc|boxing|tennis|golf|vs\\.|match|final|championship|playoff|team|win the)/.test(text)) {
    return 'sports';
  }
  if (/(bitcoin|btc|ethereum|eth|solana|crypto|token|airdrop|fdv|on-chain|blockchain)/.test(text)) {
    return 'crypto';
  }
  if (/(fed|interest rate|inflation|cpi|gdp|recession|unemployment|bond|treasury|oil|opec|gold|nasdaq|s&p|stocks?)/.test(text)) {
    return 'macro';
  }

  return 'general';
};

const normalizeTagCandidate = (value?: string): string => {
  const v = (value ?? '').trim().toLowerCase();
  if (!v) {
    return '';
  }

  const map: Record<string, string> = {
    politics: 'politics',
    political: 'politics',
    elections: 'politics',
    election: 'politics',
    sports: 'sports',
    sport: 'sports',
    crypto: 'crypto',
    macro: 'macro',
    economy: 'macro',
    economics: 'macro',
    finance: 'finance',
    financial: 'finance',
    business: 'finance',
    oil: 'oil',
    energy: 'oil',
    trending: 'trending',
    breaking: 'trending',
    news: 'trending',
    general: 'general',
    all: 'general'
  };

  return map[v] ?? '';
};

const recursiveStringCandidates = (input: unknown, depth = 0): string[] => {
  if (depth > 2 || input == null) {
    return [];
  }
  if (typeof input === 'string') {
    return [input];
  }
  if (Array.isArray(input)) {
    return input.flatMap((item) => recursiveStringCandidates(item, depth + 1));
  }
  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const picked: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        if (/(question|title|name|slug)/i.test(key)) {
          picked.push(value);
        }
      } else if (typeof value === 'object' && value) {
        picked.push(...recursiveStringCandidates(value, depth + 1));
      }
    }
    return picked;
  }
  return [];
};

export class MockPolymarketClient implements PolymarketClient {
  async fetchTicks(): Promise<PolymarketMarketTick[]> {
    const now = Date.now() / 1000;

    return [
      {
        marketId: 'mkt-us-election-2028',
        title: 'Will candidate X win the election?',
        tag: 'politics',
        bestBidYes: 0.45 + Math.sin(now / 90) * 0.01,
        bestAskYes: 0.47 + Math.sin(now / 90) * 0.01,
        liquidityUsd: 120000,
        volume5m: 4200,
        orderImbalance: 0.23
      },
      {
        marketId: 'mkt-fed-cut-sept',
        title: 'Will the Fed cut by September?',
        tag: 'macro',
        bestBidYes: 0.37 + Math.cos(now / 100) * 0.01,
        bestAskYes: 0.39 + Math.cos(now / 100) * 0.01,
        liquidityUsd: 90000,
        volume5m: 3100,
        orderImbalance: -0.07
      },
      {
        marketId: 'mkt-sports-final',
        title: 'Will Team A win the final?',
        tag: 'sports',
        bestBidYes: 0.62 + Math.sin(now / 70) * 0.008,
        bestAskYes: 0.64 + Math.sin(now / 70) * 0.008,
        liquidityUsd: 70000,
        volume5m: 5100,
        orderImbalance: 0.12
      }
    ];
  }
}

export class RealPolymarketClient implements PolymarketClient {
  private gammaTitleCache: { fetchedAt: number; map: Map<string, string> } | null = null;
  private clobTitleCache: { fetchedAt: number; map: Map<string, string> } | null = null;

  constructor(private readonly clobBaseUrl: string = env.polymarketClobBaseUrl) {}

  private async fetchGammaTitleMap(targetIds: string[]): Promise<Map<string, string>> {
    const now = Date.now();
    const cacheFreshMs = 5 * 60 * 1000;
    if (this.gammaTitleCache && now - this.gammaTitleCache.fetchedAt < cacheFreshMs) {
      const cacheHasAllTargets = targetIds.every((id) => this.gammaTitleCache?.map.has(normalizeId(id)));
      if (cacheHasAllTargets) {
        return this.gammaTitleCache.map;
      }
    }

    const map = new Map<string, string>();

    const extractTitle = (item: Record<string, unknown>): string => {
      const candidates = [
        item.question,
        item.title,
        item.name,
        item.eventTitle,
        item.event_title,
        item.market_slug,
        item.event_slug
      ];
      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim();
        }
      }
      return '';
    };

    const collectKey = (value: unknown, title: string) => {
      if (typeof value === 'string' && value.trim()) {
        map.set(normalizeId(value), title);
      }
    };

    const pushItem = (item: Record<string, unknown>) => {
      const title = extractTitle(item);
      if (!title) {
        return;
      }
      const scalarKeys = [
        item.condition_id,
        item.conditionId,
        item.clobTokenId,
        item.clob_token_id,
        item.marketId,
        item.market_id,
        item.id
      ];

      for (const key of scalarKeys) {
        collectKey(key, title);
      }

      const clobTokenIds = item.clobTokenIds;
      if (Array.isArray(clobTokenIds)) {
        for (const tokenId of clobTokenIds) {
          collectKey(tokenId, title);
        }
      } else if (typeof clobTokenIds === 'string' && clobTokenIds.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(clobTokenIds) as unknown;
          if (Array.isArray(parsed)) {
            for (const tokenId of parsed) {
              collectKey(tokenId, title);
            }
          }
        } catch {
          // ignore malformed clobTokenIds
        }
      }

      for (const maybeNested of [item.events, item.markets]) {
        if (!Array.isArray(maybeNested)) {
          continue;
        }
        for (const nestedItem of maybeNested) {
          if (nestedItem && typeof nestedItem === 'object') {
            pushItem(nestedItem as Record<string, unknown>);
          }
        }
      }
    };

    const ingestPayload = (payload: unknown) => {
      if (Array.isArray(payload)) {
        for (const item of payload) {
          if (item && typeof item === 'object') {
            pushItem(item as Record<string, unknown>);
          }
        }
        return;
      }
      if (payload && typeof payload === 'object') {
        const record = payload as Record<string, unknown>;
        for (const key of ['data', 'markets', 'events']) {
          const collection = record[key];
          if (Array.isArray(collection)) {
            for (const item of collection) {
              if (item && typeof item === 'object') {
                pushItem(item as Record<string, unknown>);
              }
            }
          }
        }
      }
    };

    const fetchAndIngest = async (endpoint: string) => {
      try {
        const res = await fetch(endpoint, { cache: 'no-store' });
        if (!res.ok) {
          return;
        }
        const payload = (await res.json()) as GammaMarketLike[] | GammaMarketLike;
        ingestPayload(payload);
      } catch {
        // Ignore enrichment failures and keep core feed functional.
      }
    };

    const pageLimit = 500;
    for (let offset = 0; offset < 2500; offset += pageLimit) {
      await fetchAndIngest(`${env.polymarketGammaBaseUrl}/markets?active=true&closed=false&limit=${pageLimit}&offset=${offset}`);
    }
    for (let offset = 0; offset < 1000; offset += pageLimit) {
      await fetchAndIngest(`${env.polymarketGammaBaseUrl}/events?active=true&closed=false&limit=${pageLimit}&offset=${offset}`);
    }

    const missing = targetIds.filter((id) => id && !map.has(normalizeId(id)));
    if (missing.length) {
      const batch = missing.slice(0, 50).map((id) => encodeURIComponent(id)).join(',');
      if (batch) {
        await fetchAndIngest(`${env.polymarketGammaBaseUrl}/markets?condition_ids=${batch}`);
        await fetchAndIngest(`${env.polymarketGammaBaseUrl}/markets?conditionIds=${batch}`);
      }
    }

    this.gammaTitleCache = { fetchedAt: now, map };
    return map;
  }

  private async fetchClobTitleMap(targetIds: string[]): Promise<Map<string, string>> {
    const now = Date.now();
    const cacheFreshMs = 5 * 60 * 1000;
    if (this.clobTitleCache && now - this.clobTitleCache.fetchedAt < cacheFreshMs) {
      const cacheHasAllTargets = targetIds.every((id) => this.clobTitleCache?.map.has(normalizeId(id)));
      if (cacheHasAllTargets) {
        return this.clobTitleCache.map;
      }
    }

    const map = new Map<string, string>();
    const headers = {
      accept: 'application/json',
      ...(env.polymarketApiKey ? { 'x-api-key': env.polymarketApiKey } : {}),
      ...(env.polymarketApiSecret ? { 'x-api-secret': env.polymarketApiSecret } : {}),
      ...(env.polymarketApiPassphrase ? { 'x-api-passphrase': env.polymarketApiPassphrase } : {}),
      ...(env.polymarketProfileKey ? { 'x-profile-key': env.polymarketProfileKey } : {})
    };

    let cursor: string | null = null;
    let pages = 0;
    const maxPages = 5;

    while (pages < maxPages) {
      const url = new URL(`${this.clobBaseUrl}/markets`);
      if (cursor) {
        url.searchParams.set('next_cursor', cursor);
      }

      try {
        const res = await fetch(url.toString(), { headers, cache: 'no-store' });
        if (!res.ok) {
          break;
        }

        const payload = (await res.json()) as ClobMarketsResponse;
        const items = Array.isArray(payload.data) ? payload.data : [];
        for (const rawItem of items) {
          const conditionId = typeof rawItem.condition_id === 'string' ? rawItem.condition_id : '';
          const question = typeof rawItem.question === 'string' ? rawItem.question.trim() : '';
          const slug = typeof rawItem.market_slug === 'string' ? rawItem.market_slug : '';
          const title = question || slugToTitle(slug);
          if (conditionId && title) {
            map.set(normalizeId(conditionId), title);
          }
          if (Array.isArray(rawItem.tokens)) {
            for (const token of rawItem.tokens) {
              if (!token || typeof token !== 'object') {
                continue;
              }
              const tokenId = typeof (token as { token_id?: unknown }).token_id === 'string' ? (token as { token_id: string }).token_id : '';
              if (tokenId && title) {
                map.set(normalizeId(tokenId), title);
              }
            }
          }
        }

        const missing = targetIds.filter((id) => id && !map.has(normalizeId(id)));
        const next = typeof payload.next_cursor === 'string' ? payload.next_cursor : '';
        if (!next || next === 'LTE=' || !missing.length) {
          break;
        }
        cursor = next;
        pages += 1;
      } catch {
        break;
      }
    }

    this.clobTitleCache = { fetchedAt: now, map };
    return map;
  }

  private async fetchSimplifiedMarkets(): Promise<SimplifiedMarket[]> {
    const headers = {
      accept: 'application/json',
      ...(env.polymarketApiKey ? { 'x-api-key': env.polymarketApiKey } : {}),
      ...(env.polymarketApiSecret ? { 'x-api-secret': env.polymarketApiSecret } : {}),
      ...(env.polymarketApiPassphrase ? { 'x-api-passphrase': env.polymarketApiPassphrase } : {}),
      ...(env.polymarketProfileKey ? { 'x-profile-key': env.polymarketProfileKey } : {})
    };

    for (const path of ['/sampling-markets', '/simplified-markets']) {
      const response = await fetch(`${this.clobBaseUrl}${path}`, { headers, cache: 'no-store' });
      if (!response.ok) {
        continue;
      }
      const payload = (await response.json()) as SimplifiedMarketsResponse;
      const rows = payload.data ?? [];
      if (rows.length) {
        return rows;
      }
    }

    throw new Error('Failed to fetch markets from sampling/simplified endpoints');
  }

  private async fetchBook(tokenId: string): Promise<BookResponse> {
    const response = await fetch(`${this.clobBaseUrl}/book?token_id=${encodeURIComponent(tokenId)}`, {
      headers: {
        accept: 'application/json',
        ...(env.polymarketApiKey ? { 'x-api-key': env.polymarketApiKey } : {}),
        ...(env.polymarketApiSecret ? { 'x-api-secret': env.polymarketApiSecret } : {}),
        ...(env.polymarketApiPassphrase ? { 'x-api-passphrase': env.polymarketApiPassphrase } : {}),
        ...(env.polymarketProfileKey ? { 'x-profile-key': env.polymarketProfileKey } : {})
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return { bids: [], asks: [] };
    }

    return (await response.json()) as BookResponse;
  }

  async fetchTicks(): Promise<PolymarketMarketTick[]> {
    const markets = await this.fetchSimplifiedMarkets();
    const nowMs = Date.now();

    const eligible = markets
      .filter((m) => {
        if (m.active === false) {
          return false;
        }
        if (m.closed === true || m.archived === true) {
          return false;
        }
        if (m.accepting_orders === false) {
          return false;
        }

        const endIso = firstNonEmpty(m.end_date_iso, m.game_start_time);
        if (endIso) {
          const endMs = Date.parse(endIso);
          if (Number.isFinite(endMs) && endMs < nowMs - 30 * 60 * 1000) {
            return false;
          }
        }
        return true;
      });

    const windowSize = 40;
    const candidates =
      eligible.length <= windowSize
        ? eligible
        : (() => {
            // Rotate market sampling window each minute so ranked opportunities don't stay stuck on the same subset.
            const offset = Math.floor(nowMs / 60_000) % eligible.length;
            const rotated = [...eligible.slice(offset), ...eligible.slice(0, offset)];
            return rotated.slice(0, windowSize);
          })();

    const targetIds = candidates.flatMap((market) => {
      const ids: string[] = [];
      if (market.condition_id) {
        ids.push(market.condition_id);
      }
      for (const token of market.tokens ?? []) {
        if (token.token_id) {
          ids.push(token.token_id);
        }
      }
      return ids;
    });

    const [clobTitleMap, gammaTitleMap] = await Promise.all([
      this.fetchClobTitleMap(targetIds),
      this.fetchGammaTitleMap(targetIds)
    ]);

    const ticks = await Promise.all(
      candidates.map(async (market) => {
        const yesToken =
          market.tokens?.find((t) => (t.outcome ?? '').toLowerCase() === 'yes') ??
          market.tokens?.[0];

        if (!yesToken?.token_id) {
          return null;
        }

        const book = await this.fetchBook(yesToken.token_id);

        const bidPrice = asNumber(book.bids?.[0]?.price, asNumber(yesToken.price, 0.5));
        const askPrice = asNumber(book.asks?.[0]?.price, Math.min(0.99, bidPrice + 0.01));
        const bidSize = asNumber(book.bids?.[0]?.size, 0);
        const askSize = asNumber(book.asks?.[0]?.size, 0);

        const bestBidYes = Math.max(0.001, Math.min(0.999, bidPrice));
        const bestAskYes = Math.max(bestBidYes + 0.0005, Math.min(0.999, askPrice));

        const totalTop = bidSize + askSize;
        const orderImbalance = totalTop > 0 ? (bidSize - askSize) / totalTop : 0;

        const marketRecord = market as unknown as Record<string, unknown>;
        const stringCandidates = recursiveStringCandidates(marketRecord).map((s) => s.trim()).filter(Boolean);

        const fromCandidates =
          stringCandidates.find((s) => s.includes('?') && s.length > 12) ??
          stringCandidates.find((s) => s.length > 16 && /\s/.test(s)) ??
          '';

        const resolvedTitle = firstNonEmpty(
          market.question,
          market.title,
          market.event_title,
          clobTitleMap.get(normalizeId(market.condition_id)),
          clobTitleMap.get(normalizeId(yesToken.token_id)),
          gammaTitleMap.get(normalizeId(market.condition_id)),
          gammaTitleMap.get(normalizeId(yesToken.token_id)),
          yesToken.outcome && !['yes', 'no'].includes(yesToken.outcome.toLowerCase()) ? `Will ${yesToken.outcome} win?` : '',
          fromCandidates,
          slugToTitle(market.market_slug),
          slugToTitle(market.event_slug)
        );

        const feedTag =
          normalizeTagCandidate(market.category) ||
          (Array.isArray(market.tags) ? market.tags.map((t) => normalizeTagCandidate(t)).find(Boolean) ?? '' : '');

        return {
          marketId: market.condition_id ?? yesToken.token_id,
          title: resolvedTitle || `Market ${String(market.condition_id ?? yesToken.token_id).slice(0, 12)}`,
          tag: firstNonEmpty(feedTag, inferTagFromText(resolvedTitle)),
          bestBidYes,
          bestAskYes,
          liquidityUsd: asNumber(market.liquidity_num ?? market.liquidity, 0),
          volume5m: asNumber(market.volume24hr ?? market.volume, 0) / 288,
          orderImbalance
        } satisfies PolymarketMarketTick;
      })
    );

    return ticks.filter((t): t is PolymarketMarketTick => Boolean(t));
  }

  async resolveTitlesByMarketIds(marketIds: string[]): Promise<Map<string, string>> {
    const targetIds = marketIds.map((id) => normalizeId(id)).filter(Boolean);
    if (!targetIds.length) {
      return new Map<string, string>();
    }

    const [clobTitleMap, gammaTitleMap] = await Promise.all([
      this.fetchClobTitleMap(targetIds),
      this.fetchGammaTitleMap(targetIds)
    ]);

    const resolved = new Map<string, string>();
    for (const id of targetIds) {
      const title = firstNonEmpty(clobTitleMap.get(id), gammaTitleMap.get(id));
      if (title) {
        resolved.set(id, title);
      }
    }
    return resolved;
  }
}
