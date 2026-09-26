import type { ComponentProps, ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Select from '@radix-ui/react-select';
import './controls.css';

// shadcn/ui Radix composition, adapted to the app's CSS (no global Tailwind reset).
// References: ui.shadcn.com/r/styles/new-york/{select,popover}.json
export function Button({ className = '', ...props }: ComponentProps<'button'>) {
  return <button data-slot="button" className={`ui-button ${className}`} {...props} />;
}
export function Input(props: ComponentProps<'input'>) {
  return <input data-slot="input" {...props} />;
}
export function Textarea(props: ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" {...props} />;
}
function Chevron() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="m4 6 4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Settings({
  children,
  label = 'Guest settings',
  subject = 'ict',
}: {
  children: ReactNode;
  label?: string;
  subject?: 'ict' | 'english';
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          className="ui-settings-trigger"
          aria-label={`${label}, user settings`}
          title={label}
        >
          <span className="ui-account-label">{label}</span> <Chevron />
        </Button>
      </Popover.Trigger>
      <Popover.Portal container={document.fullscreenElement as HTMLElement | null}>
        <Popover.Content
          aria-label="User settings"
          className="ui-popup ui-settings"
          data-subject={subject}
          align="end"
          sideOffset={8}
          collisionPadding={16}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
export function SelectControl({
  label,
  value,
  onValueChange,
  options,
  disabled = false,
  subject = 'ict',
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  disabled?: boolean;
  subject?: 'ict' | 'english';
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <Select.Trigger aria-label={label} className="ui-select" data-slot="select-trigger">
        <Select.Value />
        <Select.Icon>
          <Chevron />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={document.fullscreenElement as HTMLElement | null}>
        <Select.Content
          className="ui-popup ui-select-content"
          data-subject={subject}
          position="popper"
          sideOffset={6}
          collisionPadding={16}
        >
          <Select.ScrollUpButton className="ui-select-scroll">⌃</Select.ScrollUpButton>
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item className="ui-select-item" value={option.value} key={option.value}>
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator aria-hidden="true">✓</Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="ui-select-scroll">⌄</Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
