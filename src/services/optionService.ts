import { OptionChainItem } from '../types';

export interface OptionChainResponse {
  success: boolean;
  symbol: string;
  underlyingPrice: number;
  expiries: string[];
  chain: OptionChainItem[];
}

class OptionService {
  private baseUrl = '/api';

  async getOptionChain(symbol: string, expiration?: string): Promise<OptionChainResponse> {
    const url = new URL(`${window.location.origin}${this.baseUrl}/option-chain`);
    url.searchParams.append('symbol', symbol);
    if (expiration) {
      url.searchParams.append('expiration', expiration);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.message || errorData.details || errorData.error || 'Failed to fetch option chain';
      throw new Error(errorMsg);
    }

    return response.json();
  }

  async getQuote(symbol: string): Promise<{ price: number; change: number; changePercent: number }> {
    const url = new URL(`${window.location.origin}${this.baseUrl}/quote`);
    url.searchParams.append('symbol', symbol);
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to fetch quote');
    const data = await response.json();
    return {
      price: data.price,
      change: data.change,
      changePercent: data.changePercent
    };
  }
}

export const optionService = new OptionService();
