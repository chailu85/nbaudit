import { useEffect, useId, useRef, useState } from 'react';

export type ResponsiveSelectOption = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: ResponsiveSelectOption[];
  'aria-label': string;
  className?: string;
};

export function ResponsiveSelect({ value, onChange, options, 'aria-label': ariaLabel, className = '' }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selected = options[selectedIndex] ?? options[0];

  useEffect(() => {
    if (!open) setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
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
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex(current => {
          const delta = event.key === 'ArrowDown' ? 1 : -1;
          return (current + delta + options.length) % options.length;
        });
        return;
      }
      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        setActiveIndex(event.key === 'Home' ? 0 : options.length - 1);
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const option = options[activeIndex];
        if (option) onChange(option.value);
        setOpen(false);
        triggerRef.current?.focus();
      }
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
      {open && <div id={listId} className="responsive-select-list" role="listbox" aria-label={ariaLabel}>
        {options.map((option, index) => <button type="button" id={`${listId}-${index}`} role="option" aria-selected={option.value === value} className={`responsive-select-option ${index === activeIndex ? 'active' : ''} ${option.value === value ? 'selected' : ''}`} key={option.value} onMouseEnter={() => setActiveIndex(index)} onClick={() => { onChange(option.value); setOpen(false); triggerRef.current?.focus(); }}>{option.label}</button>)}
      </div>}
    </div>
  </div>;
}
