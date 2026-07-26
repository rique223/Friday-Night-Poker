import { memo } from 'react';
import { Moon, Sun } from 'lucide-react';

import { usePreferences } from '../contexts/PreferencesContext';

import Button from './ui/Button';

/**
 * Q56: this used to own its own `useState` seeded from localStorage at mount. Two
 * instances are rendered at once on some pages (one hidden by a CSS breakpoint rather
 * than unmounted), so clicking one left the other holding a stale value — resize past
 * the breakpoint and the now-visible toggle showed the wrong icon, and its first click
 * set the theme to what it already was. The source of truth is now PreferencesContext.
 */
const ThemeToggle = memo(function ThemeToggle() {
    const { theme, toggleTheme, t } = usePreferences();

    return (
        <Button
            variant="secondary"
            aria-label={t('toggleTheme')}
            aria-pressed={theme === 'light'}
            onClick={toggleTheme}
        >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
    );
});

export default ThemeToggle;
