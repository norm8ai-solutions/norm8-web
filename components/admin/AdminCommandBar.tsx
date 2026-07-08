/**
 * ------------------------------------------------------------------
 * File: components/admin/AdminCommandBar.tsx
 * Description: Functional global search for the Norm8 admin area.
 * Responsibilities:
 * - Search operational admin records from the shared topbar.
 * - Render a premium dropdown with grouped results.
 * - Support mouse, keyboard, Escape and Cmd/Ctrl+K interactions.
 * ------------------------------------------------------------------
 */

'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AdminGlobalSearchResponse, AdminGlobalSearchResult } from '@/lib/admin/search-types';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 220;

type DropdownPosition = {
  left: number;
  top: number;
  width: number;
};

type SearchState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

/**
 * Renders the admin global search command bar.
 *
 * @returns Search input with grouped result dropdown.
 */
export default function AdminCommandBar() {
  const router = useRouter();
  const inputId = useId();
  const listboxId = `${inputId}-results`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<AdminGlobalSearchResult[]>([]);
  const [state, setState] = useState<SearchState>('idle');
  const [open, setOpen] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);

  const normalizedQuery = query.trim();
  const groupedResults = useMemo(() => groupResults(results), [results]);
  const shouldShowPanel = open && normalizedQuery.length >= MIN_QUERY_LENGTH;

  const updateDropdownPosition = (): void => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const rect = root.getBoundingClientRect();

    setDropdownPosition({
      left: rect.left,
      top: rect.bottom + 8,
      width: rect.width,
    });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
        requestAnimationFrame(updateDropdownPosition);
      }
    };

    window.addEventListener('keydown', handleShortcut);

    return () => {
      window.removeEventListener('keydown', handleShortcut);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;

      if (!rootRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!shouldShowPanel) {
      return;
    }

    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [shouldShowPanel]);

  useEffect(() => {
    if (normalizedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setState('idle');
      setActiveIndex(0);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setState('loading');

      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Search request failed');
        }

        const payload = (await response.json()) as AdminGlobalSearchResponse;
        setResults(payload.results);
        setState(payload.results.length > 0 ? 'ready' : 'empty');
        setActiveIndex(0);
      } catch (error) {
        if (!controller.signal.aborted) {
          setResults([]);
          setState('error');
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [normalizedQuery]);

  const navigateToResult = (result: AdminGlobalSearchResult): void => {
    setOpen(false);
    setQuery('');
    router.push(result.href);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((currentIndex) => Math.min(currentIndex + 1, results.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((currentIndex) => Math.max(currentIndex - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      const activeResult = results[activeIndex];

      if (activeResult) {
        event.preventDefault();
        navigateToResult(activeResult);
        return;
      }

      if (normalizedQuery.length >= MIN_QUERY_LENGTH) {
        event.preventDefault();
        setOpen(false);
        router.push(`/admin/leads?q=${encodeURIComponent(normalizedQuery)}`);
      }
    }
  };

  const dropdown = mounted && dropdownPosition && shouldShowPanel ? createPortal(
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="admin-search-dropdown"
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        initial={{ opacity: 0, y: -6, scale: 0.98 }}
        ref={dropdownRef}
        role="listbox"
        id={listboxId}
        style={{
          left: dropdownPosition.left,
          top: dropdownPosition.top,
          width: dropdownPosition.width,
        }}
        transition={{ duration: 0.16 }}
      >
        <SearchPanelContent
          activeIndex={activeIndex}
          groupedResults={groupedResults}
          onResultClick={navigateToResult}
          results={results}
          state={state}
        />
      </motion.div>
    </AnimatePresence>,
    document.body,
  ) : null;

  return (
    <div className="admin-command-search" ref={rootRef}>
      <label className="admin-search-label" htmlFor={inputId}>
        Pesquisa global da área interna
      </label>
      <div className="admin-command-bar" role="combobox" aria-expanded={shouldShowPanel} aria-controls={listboxId}>
        <Search size={15} />
        <input
          aria-autocomplete="list"
          aria-label="Pesquisar leads, reuniões e empresas"
          id={inputId}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            requestAnimationFrame(updateDropdownPosition);
          }}
          onFocus={() => {
            setOpen(true);
            requestAnimationFrame(updateDropdownPosition);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Pesquisar leads, reuniões, empresas..."
          ref={inputRef}
          type="search"
          value={query}
        />
        {state === 'loading' ? <Loader2 className="admin-search-spinner" size={14} /> : null}
        <kbd>⌘K</kbd>
      </div>
      {dropdown}
    </div>
  );
}

type SearchPanelContentProps = {
  activeIndex: number;
  groupedResults: Array<[string, AdminGlobalSearchResult[]]>;
  onResultClick: (result: AdminGlobalSearchResult) => void;
  results: AdminGlobalSearchResult[];
  state: SearchState;
};

function SearchPanelContent({
  activeIndex,
  groupedResults,
  onResultClick,
  results,
  state,
}: SearchPanelContentProps) {
  if (state === 'loading') {
    return <p className="admin-search-state">A pesquisar...</p>;
  }

  if (state === 'error') {
    return <p className="admin-search-state admin-search-state-error">Não foi possível carregar os resultados.</p>;
  }

  if (state === 'empty') {
    return <p className="admin-search-state">Sem resultados encontrados.</p>;
  }

  let resultIndex = 0;

  return (
    <div className="admin-search-groups">
      {groupedResults.map(([group, groupResults]) => (
        <section className="admin-search-group" key={group}>
          <p className="admin-search-group-title">{group}</p>
          {groupResults.map((result) => {
            const currentIndex = resultIndex;
            resultIndex += 1;
            const active = currentIndex === activeIndex;

            return (
              <button
                aria-selected={active}
                className={active ? 'admin-search-result admin-search-result-active' : 'admin-search-result'}
                key={result.id}
                onClick={() => onResultClick(result)}
                role="option"
                type="button"
              >
                <span>
                  <strong>{result.title}</strong>
                  {result.subtitle ? <small>{result.subtitle}</small> : null}
                </span>
                <span className="admin-search-result-meta">
                  {result.status ? <em>{result.status}</em> : null}
                  {result.date ? <small>{result.date}</small> : null}
                </span>
              </button>
            );
          })}
        </section>
      ))}
      {results.length > 0 ? <p className="admin-search-hint">Enter abre o resultado selecionado · Esc fecha</p> : null}
    </div>
  );
}

function groupResults(results: AdminGlobalSearchResult[]): Array<[string, AdminGlobalSearchResult[]]> {
  const groups = new Map<string, AdminGlobalSearchResult[]>();

  results.forEach((result) => {
    const currentResults = groups.get(result.group) ?? [];
    currentResults.push(result);
    groups.set(result.group, currentResults);
  });

  return Array.from(groups.entries());
}