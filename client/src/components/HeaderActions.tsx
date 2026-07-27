import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { cn } from '../utils/cn';

import Button from './ui/Button';
import LangCurrencySwitcher from './LangCurrencySwitcher';
import OverflowMenu from './OverflowMenu';
import ThemeToggle from './ThemeToggle';

interface HeaderActionsProps {
    extraMenuItems?: ReactNode;
    showLogout?: boolean;
    showArchived?: boolean;
    className?: string;
}

export default function HeaderActions({
    extraMenuItems,
    showLogout = false,
    showArchived = true,
    className,
}: HeaderActionsProps) {
    const { t } = usePreferences();
    const navigate = useNavigate();
    const { logout } = useAuth();

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <ThemeToggle />
            <OverflowMenu ariaLabel={t('menu')}>
                <LangCurrencySwitcher />
                {showArchived && (
                    <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => navigate('/archived')}
                    >
                        {t('archived')}
                    </Button>
                )}

                {extraMenuItems}

                {showLogout && (
                    <Button
                        variant="danger"
                        className="w-full"
                        onClick={() => {
                            void logout().then(() => navigate('/login'));
                        }}
                    >
                        {/* Q81: this label was a hardcoded English "Logout". */}
                        {t('logout')}
                    </Button>
                )}
            </OverflowMenu>
        </div>
    );
}
