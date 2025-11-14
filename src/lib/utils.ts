/**
 * Utility functions for UI components
 */

/**
 * Conditionally join classNames together
 * Used for merging Tailwind CSS classes
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}
