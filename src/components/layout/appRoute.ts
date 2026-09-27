export type AppPage = 'assessment' | 'audit';

export const APP_ROUTES = {
  assessment: { href: '#assessment', mainId: 'main-content' },
  audit: { href: '#audit', mainId: 'audit-main-content' },
} as const satisfies Record<AppPage, { href: string; mainId: string }>;

/** Only whole page/skip-link anchors are routes. Share payloads belong to the share loader. */
export function readAppRoute(hash: string): AppPage | null {
  switch (hash) {
    case '':
    case '#':
    case '#assessment':
    case '#main-content':
      return 'assessment';
    case '#audit':
    case '#audit-main-content':
      return 'audit';
    default:
      return null;
  }
}
