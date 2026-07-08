export type AdminGlobalSearchResultType =
  | 'lead'
  | 'company'
  | 'submission'
  | 'audit'
  | 'meeting'
  | 'email';

export type AdminGlobalSearchResult = {
  id: string;
  type: AdminGlobalSearchResultType;
  group: string;
  title: string;
  subtitle?: string;
  status?: string;
  href: string;
  date?: string;
};

export type AdminGlobalSearchResponse = {
  query: string;
  results: AdminGlobalSearchResult[];
};
