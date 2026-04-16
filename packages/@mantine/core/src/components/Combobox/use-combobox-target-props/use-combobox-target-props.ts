import { useEffect, useRef, useState } from 'react';
import { useComboboxContext } from '../Combobox.context';

interface UseComboboxTargetPropsInput {
  targetType: 'input' | 'button' | undefined;
  withAriaAttributes: boolean | undefined;
  withKeyboardNavigation: boolean | undefined;
  withExpandedAttribute: boolean | undefined;
  onKeyDown: React.KeyboardEventHandler<HTMLElement> | undefined;
  autoComplete: string | undefined;
}

export function useComboboxTargetProps({
  onKeyDown,
  withKeyboardNavigation,
  withAriaAttributes,
  withExpandedAttribute,
  targetType,
  autoComplete,
}: UseComboboxTargetPropsInput) {
  const ctx = useComboboxContext();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);

  const handleKeyDownEvent = (event: Pick<
    KeyboardEvent,
    'key' | 'code' | 'keyCode' | 'isComposing' | 'preventDefault'
  >) => {
    if (ctx.readOnly) {
      return;
    }

    if (withKeyboardNavigation) {
      // Ignore during composition in IME
      if (event.isComposing) {
        return;
      }

      if (event.code === 'ArrowDown') {
        event.preventDefault();

        if (!ctx.store.dropdownOpened) {
          ctx.store.openDropdown('keyboard');
          setSelectedOptionId(ctx.store.selectActiveOption());
          ctx.store.updateSelectedOptionIndex('selected', { scrollIntoView: true });
        } else {
          setSelectedOptionId(ctx.store.selectNextOption());
        }
      }

      if (event.code === 'ArrowUp') {
        event.preventDefault();

        if (!ctx.store.dropdownOpened) {
          ctx.store.openDropdown('keyboard');
          setSelectedOptionId(ctx.store.selectActiveOption());
          ctx.store.updateSelectedOptionIndex('selected', { scrollIntoView: true });
        } else {
          setSelectedOptionId(ctx.store.selectPreviousOption());
        }
      }

      if (event.code === 'Enter' || event.code === 'NumpadEnter') {
        // This is a workaround for handling differences in behavior of isComposing property in Safari
        // See: https://dninomiya.github.io/form-guide/stop-enter-submit
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        if (event.keyCode === 229) {
          return;
        }

        const selectedOptionIndex = ctx.store.getSelectedOptionIndex();

        if (ctx.store.dropdownOpened && selectedOptionIndex !== -1) {
          event.preventDefault();
          ctx.store.clickSelectedOption();
        } else if (targetType === 'button') {
          event.preventDefault();
          ctx.store.openDropdown('keyboard');
        }
      }

      if (event.key === 'Escape') {
        ctx.store.closeDropdown('keyboard');
      }

      if (event.code === 'Space') {
        if (targetType === 'button') {
          event.preventDefault();
          ctx.store.toggleDropdown('keyboard');
        }
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    handleKeyDownEvent(event.nativeEvent);
  };

  useEffect(() => {
    const isSafari =
      typeof navigator !== 'undefined' &&
      /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (!isSafari || targetType !== 'button') {
      return;
    }

    const targetNode = ref.current;
    if (!targetNode) {
      return;
    }

    const listener = (event: KeyboardEvent) => {
      onKeyDown?.(event as any);
      handleKeyDownEvent(event);
    };

    targetNode.addEventListener('keydown', listener, true);
    return () => targetNode.removeEventListener('keydown', listener, true);
  }, [onKeyDown, targetType]);

  const ariaAttributes = withAriaAttributes
    ? {
        ...(withExpandedAttribute ? { role: 'combobox' as const } : {}),
        'aria-haspopup': 'listbox' as const,
        'aria-expanded': withExpandedAttribute
          ? !!(ctx.store.listId && ctx.store.dropdownOpened)
          : undefined,
        'aria-controls':
          ctx.store.dropdownOpened && ctx.store.listId ? ctx.store.listId : undefined,
        'aria-activedescendant': ctx.store.dropdownOpened
          ? selectedOptionId || undefined
          : undefined,
        autoComplete,
        'data-expanded': ctx.store.dropdownOpened || undefined,
        'data-mantine-stop-propagation': ctx.store.dropdownOpened || undefined,
      }
    : {};

  return {
    ...ariaAttributes,
    onKeyDown: handleKeyDown,
    ref,
  };
}
