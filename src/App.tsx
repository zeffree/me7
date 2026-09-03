import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AppShell, Stepper } from '@/components/layout/AppShell';
import { Landing } from '@/components/steps/Landing';
import { ProfileStep } from '@/components/steps/ProfileStep';
import { QuickStep } from '@/components/steps/QuickStep';
import { CatalogStep } from '@/components/steps/CatalogStep';
import { AddOnsStep } from '@/components/steps/AddOnsStep';
import { AssumptionsStep } from '@/components/steps/AssumptionsStep';
import { ResultsStep } from '@/components/steps/ResultsStep';
import { useAssessment } from '@/store/useAssessment';
import { readShareParam, clearShareParam } from '@/store/share';

const STEPS = {
  profile: ProfileStep,
  quick: QuickStep,
  catalog: CatalogStep,
  addons: AddOnsStep,
  assumptions: AssumptionsStep,
  results: ResultsStep,
} as const;

export default function App() {
  const { started, step, theme, hydrate } = useAssessment();
  const reduceMotion = useReducedMotion();

  // A shared link wins over whatever is in localStorage — the sender's numbers are the point.
  useEffect(() => {
    const shared = readShareParam();
    if (shared) {
      hydrate(shared);
      clearShareParam();
    }
  }, [hydrate]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const Step = STEPS[step];

  return (
    <AppShell>
      {!started ? (
        <Landing />
      ) : (
        <>
          <Stepper />
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: 'easeOut' }}
            >
              <Step />
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </AppShell>
  );
}
