import { DEFAULT_ASSUMPTIONS } from '@/model/engine';
import { DEFAULT_TEI_SETTINGS } from '@/model/tei';
import type { Assessment, SpendLine } from '@/model/types';

export const DEMO_STORY = {
  name: 'Northstar Services',
  description: 'A 1,000-person professional services firm has Microsoft 365 E3, a separate AI assistant and a growing collection of identity and security contracts.',
};

/** Synthetic scenario amounts, not vendor quotes or the catalog's category-price seeds. */
export function createDemoAssessment(): Assessment {
  const invoice = (categoryId: string, vendor: string, annual: number): SpendLine => ({
    categoryId, vendor, mode: 'annual', annual, retainPct: 0,
    amountSource: 'benchmark', savingsDelayMonths: 2,
  });
  return {
    schemaVersion: 2,
    isDemo: true,
    orgName: DEMO_STORY.name,
    seats: 1000,
    currency: 'USD',
    baseline: 'm365e3',
    assumptions: {
      ...structuredClone(DEFAULT_ASSUMPTIONS),
      baselineUnitPupm: 39,
      e7ListPupm: 99,
      e7DiscountPct: 0,
      baselinePriceSource: 'reference',
      e7PriceSource: 'reference',
      horizonYears: 3,
      transitionEnabled: true,
      transitionCost: 90_000,
    },
    lines: [
      invoice('genai-assistant', 'ChatGPT Enterprise', 360_000),
      invoice('sso-mfa', 'Okta Workforce Identity', 72_000),
      invoice('identity-governance', 'SailPoint Identity Security', 84_000),
      invoice('ztna', 'Zscaler Private Access', 144_000),
      invoice('swg', 'Zscaler Internet Access', 96_000),
      invoice('uem', 'Omnissa Workspace ONE', 96_000),
      invoice('edr-xdr', 'CrowdStrike Falcon', 120_000),
      invoice('dlp', 'Broadcom Symantec DLP', 96_000),
      invoice('email-security', 'Proofpoint Email Security', 72_000),
      invoice('siem-soar', 'Splunk SIEM', 96_000),
      invoice('saas-backup', 'Veeam Backup for Microsoft 365', 36_000),
      invoice('esignature', 'DocuSign', 24_000),
    ],
    addOns: [{
      addOnId: 'power-bi-pro', mode: 'annual', annual: 33_600, seats: 200,
      amountSource: 'benchmark', savingsDelayMonths: 2,
    }],
    addOnsReviewed: true,
    plannedCapabilities: [],
    tei: structuredClone(DEFAULT_TEI_SETTINGS),
  };
}
