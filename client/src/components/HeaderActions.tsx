import { ReactNode } from 'react';
import ThemeToggle from './ThemeToggle';
import LangCurrencySwitcher from './LangCurrencySwitcher';
import OverflowMenu from './OverflowMenu';
import { usePreferences } from '../contexts/PreferencesContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface HeaderActionsProps {
	extraMenuItems?: ReactNode;
	showLogout?: boolean;
}

export default function HeaderActions({ extraMenuItems, showLogout = false }: HeaderActionsProps) {
	const { t } = usePreferences();
	const navigate = useNavigate();
	const { logout } = useAuth();

	return (
		<div className='flex items-center gap-2'>
			<ThemeToggle />
			<OverflowMenu ariaLabel={t('menu')}>
				<LangCurrencySwitcher />
				<button className='btn btn-secondary w-full px-3 py-2' onClick={() => navigate('/archived')}>
					{t('archived')}
				</button>

				{extraMenuItems && extraMenuItems}

				{showLogout && (
					<button
						className='btn btn-danger w-full px-3 py-2'
						onClick={async () => {
							await logout();
							navigate('/login');
						}}
					>
						Logout
					</button>
				)}
			</OverflowMenu>
		</div>
	);
}
