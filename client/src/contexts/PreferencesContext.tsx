import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { Currency, Language, TranslationKey, TranslationKeys } from '../types';

type Dictionaries = Record<Language, TranslationKeys>;

const dictionaries: Dictionaries = {
    pt: {
        createSession: 'Criar Sessão',
        yourName: 'Seu nome',
        filterCreator: 'Filtrar por nome do criador',
        filter: 'Filtrar',
        week: 'Semana',
        month: 'Mês',
        year: 'Ano',
        archived: 'Arquivadas',
        ended: 'Encerrada',
        page: 'Página',
        prev: 'Anterior',
        next: 'Próxima',
        addPlayer: 'Adicionar Jogador',
        name: 'Nome',
        initialBuyIn: 'Compra inicial',
        add: 'Adicionar',
        registerBuyIn: 'Registrar Buy-in',
        registerCredit: 'Registrar Crédito',
        players: 'Jogadores',
        totalBuyIns: 'Buy-ins',
        credits: 'Créditos',
        netBalance: 'Saldo',
        cashOut: 'Cash out',
        selectPlayer: 'Selecionar jogador',
        amount: 'Valor',
        save: 'Salvar',
        provider: 'Fornecedor',
        receiver: 'Recebedor',
        finalChips: 'Fichas finais',
        confirmCashOut: 'Confirmar Encerramento',
        endSession: 'Encerrar Sessão',
        deleteArchive: 'Excluir (Arquivar)',
        payout: 'Pagamento',
        session: 'Sessão',
        inactive: 'Inativo',
        active: 'Ativo',
        loading: 'Carregando…',
        menu: 'Menu',
        sessionActions: 'Ações da sessão',
        player: 'Jogador(a)',
        playerAdded: 'Jogador adicionado',
        buyInRegistered: 'Compra registrada',
        creditRegistered: 'Crédito registrado',
        sessionEnded: 'Sessão encerrada',
        failedLoadSession: 'Falha ao carregar sessão',
        failedAddPlayer: 'Falha ao adicionar jogador',
        failedRegisterBuyIn: 'Falha ao registrar compra',
        failedRegisterCredit: 'Falha ao registrar crédito',
        failedCashOut: 'Falha ao realizar o cash out',
        failedEndSession: 'Falha ao encerrar sessão',
        confirmEndSession: 'Encerrar esta sessão?',
        cashOutAllFirst: 'Realize o cash out de todos os jogadores antes de encerrar a sessão',
        failedLoadSessions: 'Falha ao carregar sessões',
        failedCreateSession: 'Falha ao criar sessão',
        failedLoadArchived: 'Falha ao carregar sessões arquivadas',
        sessionCreated: 'Sessão criada',
        archivedSessions: 'Sessões Arquivadas',
        noArchivedSessions: 'Sem sessões arquivadas ainda',
        noArchivedSessionsHint: 'Quando você arquivar sessões, elas aparecerão aqui.',
        back: 'Voltar',
        orderedNewest: 'Sessões são ordenadas da mais recente para a mais antiga em cada grupo.',
        of: 'de',
        groupBy: 'Agrupar por',
        currencyBRL: 'Real',
        currencyUSD: 'Dólar',
        currencyEUR: 'Euro',
        login: 'Login',
        emailOrUsername: 'E-mail ou usuário',
        password: 'Senha',
        enterCredentials: 'Insira suas credenciais para continuar.',
        emailOrUsernameRequired: 'E-mail ou usuário é obrigatório',
        passwordRequired: 'Senha é obrigatória',
    },
    en: {
        createSession: 'Create Session',
        yourName: 'Your name',
        filterCreator: 'Filter by creator name',
        filter: 'Filter',
        week: 'Week',
        month: 'Month',
        year: 'Year',
        archived: 'Archived',
        ended: 'Ended',
        page: 'Page',
        prev: 'Prev',
        next: 'Next',
        addPlayer: 'Add Player',
        name: 'Name',
        initialBuyIn: 'Initial buy-in',
        add: 'Add',
        registerBuyIn: 'Register Buy-in',
        registerCredit: 'Register Credit',
        players: 'Players',
        totalBuyIns: 'Total Buy-ins',
        credits: 'Credits',
        netBalance: 'NetBalance',
        cashOut: 'Cash Out',
        selectPlayer: 'Select player',
        amount: 'Amount',
        save: 'Save',
        provider: 'Provider',
        receiver: 'Receiver',
        finalChips: 'Final chip count',
        confirmCashOut: 'Confirm Cash Out',
        endSession: 'End Session',
        deleteArchive: 'Delete (Archive)',
        payout: 'Payout',
        session: 'Session',
        inactive: 'Inactive',
        active: 'Active',
        loading: 'Loading…',
        menu: 'Menu',
        sessionActions: 'Session actions',
        player: 'Player',
        playerAdded: 'Player added',
        buyInRegistered: 'Buy-in registered',
        creditRegistered: 'Credit registered',
        sessionEnded: 'Session ended',
        failedLoadSession: 'Failed to load session',
        failedAddPlayer: 'Failed to add player',
        failedRegisterBuyIn: 'Failed to register buy-in',
        failedRegisterCredit: 'Failed to register credit',
        failedCashOut: 'Failed to cash out',
        failedEndSession: 'Failed to end session',
        confirmEndSession: 'End this session?',
        cashOutAllFirst: 'Cash out all players before ending the session',
        failedLoadSessions: 'Failed to load sessions',
        failedCreateSession: 'Failed to create session',
        failedLoadArchived: 'Failed to load archived sessions',
        sessionCreated: 'Session created',
        archivedSessions: 'Archived Sessions',
        noArchivedSessions: 'No archived sessions yet',
        noArchivedSessionsHint: 'When you archive sessions, they will show up here.',
        back: 'Back',
        orderedNewest: 'Sessions are ordered newest first within each group.',
        of: 'of',
        groupBy: 'Group by',
        currencyBRL: 'Real',
        currencyUSD: 'Dollar',
        currencyEUR: 'Euro',
        login: 'Login',
        emailOrUsername: 'Email or username',
        password: 'Password',
        enterCredentials: 'Enter your credentials to continue.',
        emailOrUsernameRequired: 'Email or username is required',
        passwordRequired: 'Password is required',
    },
    es: {
        createSession: 'Crear Sesión',
        yourName: 'Tu nombre',
        filterCreator: 'Filtrar por nombre del creador',
        filter: 'Filtrar',
        week: 'Semana',
        month: 'Mes',
        year: 'Año',
        archived: 'Archivadas',
        ended: 'Finalizada',
        page: 'Página',
        prev: 'Anterior',
        next: 'Siguiente',
        addPlayer: 'Agregar Jugador',
        name: 'Nombre',
        initialBuyIn: 'Compra inicial',
        add: 'Agregar',
        registerBuyIn: 'Registrar Buy-in',
        registerCredit: 'Registrar Crédito',
        players: 'Jugadores',
        totalBuyIns: 'Total de Compras',
        credits: 'Créditos',
        netBalance: 'Balance',
        cashOut: 'Retirar',
        selectPlayer: 'Seleccionar jugador',
        amount: 'Importe',
        save: 'Guardar',
        provider: 'Proveedor',
        receiver: 'Receptor',
        finalChips: 'Fichas finales',
        confirmCashOut: 'Confirmar Retiro',
        endSession: 'Finalizar Sesión',
        deleteArchive: 'Eliminar (Archivar)',
        payout: 'Pago',
        session: 'Sesión',
        inactive: 'Inactivo',
        active: 'Activo',
        loading: 'Cargando…',
        menu: 'Menú',
        sessionActions: 'Acciones de la sesión',
        player: 'Jugador',
        playerAdded: 'Jugador agregado',
        buyInRegistered: 'Compra registrada',
        creditRegistered: 'Crédito registrado',
        sessionEnded: 'Sesión finalizada',
        failedLoadSession: 'Error al cargar la sesión',
        failedAddPlayer: 'Error al agregar jugador',
        failedRegisterBuyIn: 'Error al registrar compra',
        failedRegisterCredit: 'Error al registrar crédito',
        failedCashOut: 'Error al retirar',
        failedEndSession: 'Error al finalizar sesión',
        confirmEndSession: '¿Finalizar esta sesión?',
        cashOutAllFirst: 'Retira a todos los jugadores antes de finalizar la sesión',
        failedLoadSessions: 'Error al cargar sesiones',
        failedCreateSession: 'Error al crear la sesión',
        failedLoadArchived: 'Error al cargar sesiones archivadas',
        sessionCreated: 'Sesión creada',
        archivedSessions: 'Sesiones Archivadas',
        noArchivedSessions: 'Aún no hay sesiones archivadas',
        noArchivedSessionsHint: 'Cuando archives sesiones, aparecerán aquí.',
        back: 'Volver',
        orderedNewest:
            'Las sesiones están ordenadas de la más reciente a la más antigua dentro de cada grupo.',
        of: 'de',
        groupBy: 'Agrupar por',
        currencyBRL: 'Real',
        currencyUSD: 'Dólar',
        currencyEUR: 'Euro',
        login: 'Iniciar sesión',
        emailOrUsername: 'Correo o usuario',
        password: 'Contraseña',
        enterCredentials: 'Ingresa tus credenciales para continuar.',
        emailOrUsernameRequired: 'Correo o usuario es obligatorio',
        passwordRequired: 'La contraseña es obligatoria',
    },
};

type Context = {
    lang: Language;
    setLang: (l: Language) => void;
    currency: Currency;
    setCurrency: (c: Currency) => void;
    t: (key: TranslationKey) => string;
    formatCurrency: (value: number) => string;
};

const PreferencesContext = createContext<Context | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLang] = useState<Language>(
        () => (localStorage.getItem('lang') as Language) || 'pt',
    );
    const [currency, setCurrency] = useState<Currency>(
        () => (localStorage.getItem('currency') as Currency) || 'BRL',
    );

    useEffect(() => {
        localStorage.setItem('lang', lang);
    }, [lang]);

    useEffect(() => {
        localStorage.setItem('currency', currency);
    }, [currency]);

    const t = (key: TranslationKey): string => dictionaries[lang][key] || key;

    const formatCurrency = useMemo(() => {
        return (value: number) =>
            new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US', {
                style: 'currency',
                currency,
            }).format(value);
    }, [lang, currency]);

    const value = useMemo(
        () => ({ lang, setLang, currency, setCurrency, t, formatCurrency }),
        [lang, currency, t, formatCurrency],
    );
    return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
    const ctx = useContext(PreferencesContext);
    if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider');
    return ctx;
}
