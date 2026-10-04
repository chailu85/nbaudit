import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

export type ResponsiveSelectOption = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: ResponsiveSelectOption[];
  'aria-label': string;
  className?: string;
};

type MenuPlacement = { direction: 'down' | 'up'; maxHeight: number };

const VIEWPORT_GUTTER = 8;

export function ResponsiveSelect({ value, onChange, options, 'aria-label': ariaLabel, className = '' }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<MenuPlacement>({ direction: 'down', maxHeight: 0 });
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selected = options[selectedIndex] ?? options[0];

  useEffect(() => {
    if (!open) setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePlacement = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const optionHeight = rootFontSize * 2.5;
      const desiredHeight = optionHeight * options.length + 2;
      const rect = trigger.getBoundingClientRect();
      const below = Math.max(0, window.innerHeight - rect.bottom - VIEWPORT_GUTTER);
      const above = Math.max(0, rect.top - VIEWPORT_GUTTER);
      const direction = below < desiredHeight && above > below ? 'up' : 'down';
      const available = direction === 'up' ? above : below;
      setPlacement({ direction, maxHeight: Math.max(1, Math.min(desiredHeight, available)) });
    };
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const handled = ['Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key);
      if (!handled) return;
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key === 'Tab') {
        setOpen(false);
        return;
      }
      event.preventDefault();
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        setActiveIndex(current => {
          const delta = event.key === 'ArrowDown' ? 1 : -1;
          return (current + delta + options.length) % options.length;
        });
        return;
      }
      if (event.key === 'Home' || event.key === 'End') {
        setActiveIndex(event.key === 'Home' ? 0 : options.length - 1);
        return;
      }
      const option = options[activeIndex];
      if (option) onChange(option.value);
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activeIndex, onChange, open, options]);

  return <div ref={rootRef} className={`responsive-select ${className}`}>
    <select className="responsive-select-native" value={value} onChange={event => onChange(event.target.value)} aria-label={ariaLabel}>
      {options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
    </select>
    <div className="responsive-select-desktop">
      <button ref={triggerRef} type="button" className="responsive-select-trigger" role="combobox" aria-label={ariaLabel} aria-expanded={open} aria-controls={listId} aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined} onClick={() => setOpen(current => !current)}>
        <span>{selected?.label ?? ''}</span><span aria-hidden="true">▾</span>
      </button>
      {open && <div id={listId} className={`responsive-select-list ${placement.direction === 'up' ? 'opens-up' : ''}`} role="listbox" aria-label={ariaLabel} style={{ maxHeight: placement.maxHeight ? `${placement.maxHeight}px` : undefined }}>
        {options.map((option, index) => <button type="button" id={`${listId}-${index}`} role="option" aria-selected={option.value === value} className={`responsive-select-option ${index === activeIndex ? 'active' : ''} ${option.value === value ? 'selected' : ''}`} key={option.value} onMouseEnter={() => setActiveIndex(index)} onClick={() => { onChange(option.value); setOpen(false); triggerRef.current?.focus(); }}>{option.label}</button>)}
      </div>}
    </div>
  </div>;
}
