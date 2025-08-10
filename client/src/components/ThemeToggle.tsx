import { memo, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

function getInitialTheme(): 'dark' | 'light' {
	if (typeof window === 'undefined') return 'dark';
	const stored = localStorage.getItem('theme') as 'dark' | 'light' | null;
	if (stored) return stored;
	const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
	return prefersDark ? 'dark' : 'light';
}

const ThemeToggle = memo(function ThemeToggle() {
	const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme());

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
		localStorage.setItem('theme', theme);
	}, [theme]);

	return (
		<button
			aria-label='Toggle theme'
			className='btn btn-secondary px-3 py-2'
			onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
		>
			{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
		</button>
	);
});

export default ThemeToggle;
