import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ steps, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const updateCoords = useCallback(() => {
    const step = steps[currentStep];
    if (step.position === 'center') {
      setCoords({ top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 });
      return;
    }

    const element = document.getElementById(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      
      // Scroll into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep, steps]);

  useEffect(() => {
    updateCoords();
    window.addEventListener('resize', updateCoords);
    return () => window.removeEventListener('resize', updateCoords);
  }, [updateCoords]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];

  const getPopoverStyle = () => {
    const padding = 16;
    if (step.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    switch (step.position) {
      case 'bottom':
        return {
          top: coords.top + coords.height + padding,
          left: coords.left + coords.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'top':
        return {
          top: coords.top - padding,
          left: coords.left + coords.width / 2,
          transform: 'translate(-50%, -100%)',
        };
      case 'left':
        return {
          top: coords.top + coords.height / 2,
          left: coords.left - padding,
          transform: 'translate(-100%, -50%)',
        };
      case 'right':
        return {
          top: coords.top + coords.height / 2,
          left: coords.left + coords.width + padding,
          transform: 'translate(0, -50%)',
        };
      default:
        return {};
    }
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Overlay with hole */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] pointer-events-auto" style={{
        clipPath: step.position === 'center' 
          ? 'none' 
          : `polygon(0% 0%, 0% 100%, ${coords.left}px 100%, ${coords.left}px ${coords.top}px, ${coords.left + coords.width}px ${coords.top}px, ${coords.left + coords.width}px ${coords.top + coords.height}px, ${coords.left}px ${coords.top + coords.height}px, ${coords.left}px 100%, 100% 100%, 100% 0%)`
      }} onClick={onSkip} />

      {/* Popover */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="absolute pointer-events-auto w-[320px]"
          style={getPopoverStyle() as any}
        >
          <Card className="shadow-2xl border-blue-100 overflow-hidden">
            <div className="h-1 bg-blue-600" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                {currentStep === 0 && <Zap className="h-4 w-4 text-blue-600" />}
                {step.title}
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={onSkip}>
                <X className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                {step.content}
              </p>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t flex items-center justify-between py-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Step {currentStep + 1} of {steps.length}
              </div>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={handlePrev}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" className="h-8 px-4 gap-2" onClick={handleNext}>
                  {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
          
          {/* Arrow */}
          {step.position !== 'center' && (
            <div className={`absolute w-3 h-3 bg-white border-l border-t border-blue-100 rotate-45 ${
              step.position === 'bottom' ? '-top-1.5 left-1/2 -translate-x-1/2' :
              step.position === 'top' ? '-bottom-1.5 left-1/2 -translate-x-1/2 border-l-0 border-t-0 border-r border-b' :
              step.position === 'left' ? '-right-1.5 top-1/2 -translate-y-1/2 border-l-0 border-t-0 border-r border-b rotate-[-135deg]' :
              step.position === 'right' ? '-left-1.5 top-1/2 -translate-y-1/2 rotate-[-135deg]' : ''
            }`} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
