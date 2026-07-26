/**
 * Q78: this barrel existed but nothing imported from it — every consumer reached for
 * `../ui/Button` directly. It is now the single entry point for the primitives.
 */
export { default as Button, type ButtonProps } from './Button';
export { default as Input, type InputProps } from './Input';
export { default as LoadingSpinner } from './LoadingSpinner';
export { default as Select, type SelectOption, type SelectProps } from './Select';
