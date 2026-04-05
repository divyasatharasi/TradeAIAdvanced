export interface OptionLeg {
  id: string;
  type: 'CALL' | 'PUT';
  side: 'BUY' | 'SELL';
  strike: number;
  expiry: string;
  premium: number;
  quantity: number;
  lotSize: number;
}

export interface Strategy {
  name: string;
  legs: OptionLeg[];
  spotPrice: number;
}

export interface PayoffPoint {
  price: number;
  profit: number;
  currentProfit: number;
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface OptionChainItem {
  strike: number;
  call: {
    premium: number;
    delta: number;
    theta: number;
    gamma: number;
    vega: number;
    iv: number;
  };
  put: {
    premium: number;
    delta: number;
    theta: number;
    gamma: number;
    vega: number;
    iv: number;
  };
}
