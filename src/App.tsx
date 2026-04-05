/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate, 
  useLocation 
} from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Info, 
  Settings, 
  Search,
  ChevronDown,
  Plus,
  RefreshCw,
  BarChart3,
  Layers,
  Zap,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

import { OptionLeg, Strategy, OptionChainItem, SavedStrategy } from './types';
import { generatePayoffData, calculateStrategyGreeks, calculatePayoff, estimateMargin, calculatePOP, getDaysToExpiry, generateGreeksData } from './lib/options';
import { generateMockOptionChain, INSTRUMENTS, STRATEGY_PRESETS, getExpiriesForInstrument } from './lib/mockData';
import { PayoffChart } from './components/PayoffChart';
import { StrategyPanel } from './components/StrategyPanel';
import { OptionChain } from './components/OptionChain';
import { GreeksChart } from './components/GreeksChart';
import { Portfolio } from './components/Portfolio';
import { OnboardingTour, TourStep } from './components/OnboardingTour';

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [selectedInstrument, setSelectedInstrument] = useState(INSTRUMENTS[0]);
  const [availableExpiries, setAvailableExpiries] = useState<string[]>(getExpiriesForInstrument(INSTRUMENTS[0]));
  const [selectedExpiry, setSelectedExpiry] = useState(availableExpiries[0]);
  const [legs, setLegs] = useState<OptionLeg[]>([]);
  const [spotPrice, setSpotPrice] = useState(selectedInstrument.spot);
  const [activeChartTab, setActiveChartTab] = useState<'payoff' | 'greeks'>('payoff');
  const [savedStrategies, setSavedStrategies] = useState<SavedStrategy[]>([]);
  const [showTour, setShowTour] = useState(false);

  // Load saved strategies and check for tour on mount
  useEffect(() => {
    const saved = localStorage.getItem('optionwise_strategies');
    if (saved) {
      try {
        setSavedStrategies(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load strategies', e);
      }
    }

    const tourCompleted = localStorage.getItem('optionwise_tour_completed');
    if (!tourCompleted) {
      setShowTour(true);
    }
  }, []);

  // Save strategies to localStorage when they change
  useEffect(() => {
    localStorage.setItem('optionwise_strategies', JSON.stringify(savedStrategies));
  }, [savedStrategies]);

  // Update expiries and spot price when instrument changes
  useEffect(() => {
    const expiries = getExpiriesForInstrument(selectedInstrument);
    setAvailableExpiries(expiries);
    setSelectedExpiry(expiries[0]);
    setSpotPrice(selectedInstrument.spot);
    // Clear legs when instrument changes to avoid confusion
    setLegs([]);
  }, [selectedInstrument]);

  const applyPreset = (presetName: string) => {
    const preset = STRATEGY_PRESETS.find(p => p.name === presetName);
    if (!preset) return;
    
    const newLegs = preset.getLegs(spotPrice, selectedInstrument.step, selectedInstrument.lotSize, selectedExpiry).map(leg => ({
      ...leg,
      id: Math.random().toString(36).substr(2, 9),
    })) as OptionLeg[];
    
    setLegs(newLegs);
  };

  const optionChainData = useMemo(() => {
    return generateMockOptionChain(selectedInstrument.spot, selectedInstrument.step);
  }, [selectedInstrument]);

  const payoffData = useMemo(() => {
    return generatePayoffData(legs, spotPrice);
  }, [legs, spotPrice]);

  const greeksData = useMemo(() => {
    return generateGreeksData(legs, spotPrice);
  }, [legs, spotPrice]);

  const greeks = useMemo(() => {
    const daysToExpiry = getDaysToExpiry(selectedExpiry);
    return calculateStrategyGreeks(legs, spotPrice, daysToExpiry);
  }, [legs, spotPrice, selectedExpiry]);

  const summary = useMemo(() => {
    if (legs.length === 0) return null;
    
    // Calculate Max Profit / Max Loss
    // This is a simplified estimation for the summary
    const profits = payoffData.map(p => p.profit);
    const maxProfit = Math.max(...profits);
    const maxLoss = Math.min(...profits);
    
    // Find breakevens (where profit crosses 0)
    const breakevens: number[] = [];
    for (let i = 0; i < payoffData.length - 1; i++) {
      if ((payoffData[i].profit < 0 && payoffData[i+1].profit >= 0) || 
          (payoffData[i].profit > 0 && payoffData[i+1].profit <= 0)) {
        breakevens.push(payoffData[i].price);
      }
    }

    const margin = estimateMargin(legs, spotPrice);
    const netCredit = legs.reduce((acc, leg) => acc + (leg.side === 'SELL' ? leg.premium : -leg.premium) * leg.quantity * leg.lotSize, 0);
    const rom = margin > 0 ? (maxProfit / margin) * 100 : 0;
    const daysToExpiry = getDaysToExpiry(selectedExpiry);
    const pop = calculatePOP(legs, spotPrice, daysToExpiry);

    return {
      maxProfit: maxProfit > 1000000 ? 'Unlimited' : `₹${Math.round(maxProfit).toLocaleString()}`,
      maxLoss: maxLoss < -1000000 ? 'Unlimited' : `₹${Math.round(Math.abs(maxLoss)).toLocaleString()}`,
      breakevens: breakevens.map(b => Math.round(b)).join(', '),
      riskReward: maxLoss !== 0 ? (maxProfit / Math.abs(maxLoss)).toFixed(2) : 'N/A',
      netCredit,
      margin,
      rom: rom > 1000 ? 'N/A' : `${rom.toFixed(1)}%`,
      pop: `${pop}%`
    };
  }, [payoffData, legs, spotPrice]);

  const addLeg = (type: 'CALL' | 'PUT', side: 'BUY' | 'SELL', strike: number, premium: number) => {
    const newLeg: OptionLeg = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      side,
      strike,
      expiry: selectedExpiry,
      premium,
      quantity: 1,
      lotSize: selectedInstrument.lotSize,
    };
    setLegs([...legs, newLeg]);
  };

  const removeLeg = (id: string) => {
    setLegs(legs.filter(leg => leg.id !== id));
  };

  const updateLeg = (id: string, updates: Partial<OptionLeg>) => {
    setLegs(legs.map(leg => leg.id === id ? { ...leg, ...updates } : leg));
  };

  const clearStrategy = () => setLegs([]);

  const saveStrategy = () => {
    if (legs.length === 0) return;
    const newStrategy: SavedStrategy = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Strategy ${savedStrategies.length + 1}`,
      instrument: selectedInstrument.name,
      expiry: selectedExpiry,
      legs: [...legs],
      spotPrice: spotPrice,
      createdAt: new Date().toISOString(),
    };
    setSavedStrategies([newStrategy, ...savedStrategies]);
    navigate('/portfolio');
  };

  const deleteSavedStrategy = (id: string) => {
    setSavedStrategies(savedStrategies.filter(s => s.id !== id));
  };

  const loadSavedStrategy = (strategy: SavedStrategy) => {
    const instrument = INSTRUMENTS.find(i => i.name === strategy.instrument);
    if (instrument) {
      setSelectedInstrument(instrument);
      setSpotPrice(strategy.spotPrice);
      setSelectedExpiry(strategy.expiry);
      setLegs(strategy.legs);
      navigate('/');
    }
  };

  const tourSteps: TourStep[] = [
    {
      target: 'welcome',
      title: 'Welcome to OptionWise',
      content: 'The most advanced option strategy builder and analyzer. Let\'s take a quick tour of the features.',
      position: 'center'
    },
    {
      target: 'instrument-selector',
      title: 'Select Instrument',
      content: 'Choose from NIFTY, BANKNIFTY, FINNIFTY, or SENSEX to start building your strategy.',
      position: 'bottom'
    },
    {
      target: 'strategy-presets',
      title: 'Strategy Presets',
      content: 'Quickly apply popular strategies like Iron Condors, Straddles, or Bull Call Spreads with one click.',
      position: 'bottom'
    },
    {
      target: 'payoff-chart-container',
      title: 'Payoff Projection',
      content: 'Visualize your potential profit and loss across different price levels. Switch to Greeks view to see Delta, Theta, and more.',
      position: 'top'
    },
    {
      target: 'option-chain-container',
      title: 'Interactive Option Chain',
      content: 'Add legs directly from the chain. ITM and OTM options are highlighted for clarity.',
      position: 'top'
    },
    {
      target: 'strategy-builder-container',
      title: 'Strategy Builder',
      content: 'Manage your active legs here. Adjust quantities, strikes, or remove legs as needed.',
      position: 'left'
    },
    {
      target: 'strategy-summary-container',
      title: 'Real-time Summary',
      content: 'Get instant feedback on Max Profit, Max Loss, Margin requirements, and Greeks. Probability of Profit (POP) helps you gauge success.',
      position: 'left'
    },
    {
      target: 'portfolio-button',
      title: 'My Portfolio',
      content: 'Save your favorite strategies and track them over time in your personal portfolio.',
      position: 'bottom'
    }
  ];

  const completeTour = () => {
    setShowTour(false);
    localStorage.setItem('optionwise_tour_completed', 'true');
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        {showTour && (
          <OnboardingTour 
            steps={tourSteps} 
            onComplete={completeTour} 
            onSkip={completeTour} 
          />
        )}
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Zap className="text-white h-5 w-5" />
              </div>
              <h1 id="welcome" className="text-xl font-bold tracking-tight text-slate-900">OptionWise</h1>
              <Badge variant="secondary" className="ml-2 font-mono text-[10px] uppercase tracking-wider">Beta</Badge>
            </div>

            <div className="flex items-center gap-4">
              <Button 
                id="portfolio-button"
                variant={location.pathname === '/portfolio' ? "default" : "ghost"} 
                size="sm" 
                className="gap-2"
                onClick={() => navigate('/portfolio')}
              >
                <TrendingUp className="h-4 w-4" />
                Portfolio ({savedStrategies.length})
              </Button>
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
                <Search className="h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search Instrument..." 
                  className="bg-transparent border-none outline-none text-sm w-40"
                />
              </div>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5 text-slate-500" />
              </Button>
              <div className="h-8 w-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-700">JD</span>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          <Routes>
            <Route path="/portfolio" element={
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                    My Portfolio
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                    Back to Builder
                  </Button>
                </div>
                <Portfolio 
                  strategies={savedStrategies} 
                  onDelete={deleteSavedStrategy} 
                  onLoad={loadSavedStrategy} 
                />
              </div>
            } />
            <Route path="/" element={
              <>
                {/* Top Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card id="instrument-selector" className="md:col-span-1 shadow-sm border-slate-200">
                    <CardContent className="p-4">
                      <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Instrument</label>
                      <Select 
                        value={selectedInstrument.name} 
                        onValueChange={(val) => setSelectedInstrument(INSTRUMENTS.find(i => i.name === val)!)}
                      >
                        <SelectTrigger className="w-full font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INSTRUMENTS.map(inst => (
                            <SelectItem key={inst.name} value={inst.name}>{inst.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-1 shadow-sm border-slate-200">
                    <CardContent className="p-4">
                      <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Expiry</label>
                      <Select value={selectedExpiry} onValueChange={setSelectedExpiry}>
                        <SelectTrigger className="w-full font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableExpiries.map(exp => (
                            <SelectItem key={exp} value={exp}>{exp}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  <Card id="strategy-presets" className="md:col-span-1 shadow-sm border-slate-200">
                    <CardContent className="p-4">
                      <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Presets</label>
                      <Select onValueChange={applyPreset}>
                        <SelectTrigger className="w-full font-medium">
                          <SelectValue placeholder="Select Strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          {STRATEGY_PRESETS.map(preset => (
                            <SelectItem key={preset.name} value={preset.name}>{preset.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-1 shadow-sm border-slate-200 bg-blue-50/50 border-blue-100">
                    <CardContent className="p-4 flex items-center justify-between h-full">
                      <div>
                        <label className="text-xs font-semibold text-blue-600 uppercase mb-1 block">Current Spot</label>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold tracking-tight">₹{spotPrice.toLocaleString()}</span>
                          <span className="text-sm font-medium text-green-600 flex items-center gap-0.5">
                            <TrendingUp className="h-3 w-3" /> +1.24%
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="bg-white" onClick={() => setSpotPrice(selectedInstrument.spot)}>
                          <RefreshCw className="h-4 w-4 mr-2" /> Reset
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Analysis & Strategy */}
                  <div className="lg:col-span-8 space-y-6">
                    {/* Payoff Chart */}
                    <Card id="payoff-chart-container" className="shadow-md border-slate-200 overflow-hidden">
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <div>
                          <Tabs value={activeChartTab} onValueChange={(v) => setActiveChartTab(v as any)} className="w-auto">
                            <TabsList className="bg-slate-100 h-8">
                              <TabsTrigger value="payoff" className="text-xs gap-2">
                                <BarChart3 className="h-3.5 w-3.5" />
                                Payoff
                              </TabsTrigger>
                              <TabsTrigger value="greeks" className="text-xs gap-2">
                                <Zap className="h-3.5 w-3.5" />
                                Greeks
                              </TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>
                        <div className="flex gap-2 items-center">
                          {legs.length > 0 && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                              onClick={saveStrategy}
                            >
                              <Layers className="h-3.5 w-3.5" />
                              Save Strategy
                            </Button>
                          )}
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Profit Zone</Badge>
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Loss Zone</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {activeChartTab === 'payoff' ? (
                          <PayoffChart data={payoffData} currentSpot={spotPrice} />
                        ) : (
                          <GreeksChart data={greeksData} currentSpot={spotPrice} />
                        )}
                      </CardContent>
                    </Card>

                    {/* Option Chain */}
                    <Card id="option-chain-container" className="shadow-md border-slate-200">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Layers className="h-5 w-5 text-blue-600" />
                            Option Chain
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Info className="h-4 w-4" />
                            <span>LTP updated real-time</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-[500px]">
                          <OptionChain data={optionChainData} spotPrice={spotPrice} onAddLeg={addLeg} />
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column: Strategy & Summary */}
                  <div className="lg:col-span-4 space-y-6">
                    {/* Strategy Panel */}
                    <Card id="strategy-builder-container" className="shadow-md border-slate-200">
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Target className="h-5 w-5 text-blue-600" />
                          Builder
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={clearStrategy}>
                          Clear All
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <StrategyPanel legs={legs} onRemoveLeg={removeLeg} onUpdateLeg={updateLeg} />
                      </CardContent>
                    </Card>

                    {/* Summary & Greeks */}
                    <AnimatePresence>
                      {legs.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="space-y-6"
                        >
                          <Card id="strategy-summary-container" className="shadow-md border-slate-200 bg-slate-900 text-white">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm uppercase tracking-wider text-slate-400">Strategy Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <p className="text-xs text-slate-400">Max Profit</p>
                                  <p className={`text-lg font-bold ${summary?.maxProfit === 'Unlimited' ? 'text-green-400' : 'text-green-400'}`}>
                                    {summary?.maxProfit}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-slate-400">Max Loss</p>
                                  <p className={`text-lg font-bold ${summary?.maxLoss === 'Unlimited' ? 'text-red-400' : 'text-red-400'}`}>
                                    {summary?.maxLoss}
                                  </p>
                                </div>
                              </div>
                              
                              <Separator className="bg-slate-800" />
                              
                              <div className="space-y-1">
                                <p className="text-xs text-slate-400">Breakevens</p>
                                <p className="text-sm font-mono">{summary?.breakevens || 'None'}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <p className="text-xs text-slate-400">Risk/Reward</p>
                                  <p className="text-sm font-bold">{summary?.riskReward}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-slate-400">Net Credit/Debit</p>
                                  <p className={`text-sm font-bold ${summary && summary.netCredit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ₹{summary && Math.abs(summary.netCredit).toLocaleString()} {summary && summary.netCredit >= 0 ? '(Cr)' : '(Dr)'}
                                  </p>
                                </div>
                              </div>

                              <Separator className="bg-slate-800" />

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <p className="text-xs text-slate-400">Estimated Margin</p>
                                  <p className="text-lg font-bold text-blue-400">
                                    ₹{summary?.margin.toLocaleString()}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-slate-400">Return on Margin</p>
                                  <p className="text-lg font-bold text-blue-400">
                                    {summary?.rom}
                                  </p>
                                </div>
                              </div>

                              <Separator className="bg-slate-800" />

                              <div className="space-y-3">
                                <p className="text-xs text-slate-400 uppercase tracking-wider">Strategy Greeks</p>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">Delta</span>
                                    <span className={`font-mono font-bold ${greeks.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {greeks.delta.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">Theta</span>
                                    <span className={`font-mono font-bold ${greeks.theta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {greeks.theta.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">Gamma</span>
                                    <span className="font-mono font-bold text-slate-200">
                                      {greeks.gamma.toFixed(3)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">Vega</span>
                                    <span className="font-mono font-bold text-slate-200">
                                      {greeks.vega.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <Separator className="bg-slate-800" />

                              <div className="space-y-1">
                                <p className="text-xs text-slate-400">Probability of Profit</p>
                                <p className="text-2xl font-bold text-green-400">
                                  {summary?.pop}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </>
            } />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t bg-white py-8 mt-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <span className="font-bold">OptionWise</span>
                <span className="text-slate-400 text-sm ml-4">© 2026 OptionWise Analytics. All rights reserved.</span>
              </div>
              <div className="flex gap-6 text-sm text-slate-500">
                <button 
                  onClick={() => {
                    localStorage.removeItem('optionwise_tour_completed');
                    setShowTour(true);
                  }}
                  className="hover:text-blue-600 transition-colors"
                >
                  Restart Tour
                </button>
                <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
                <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
                <a href="#" className="hover:text-blue-600 transition-colors">API Documentation</a>
                <a href="#" className="hover:text-blue-600 transition-colors">Support</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
