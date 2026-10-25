import { useEffect, useState } from "react";
import Splash from "./components/Splash";
import Dashboard from "./components/Dashboard";
import CustomerPage from "./components/CustomerPage";
import KasaPage from "./components/KasaPage";
import NewCustomerPage from "./components/NewCustomerPage";
import MenuDrawer from "./components/MenuDrawer";
import ProfilePage from "./components/ProfilePage";
import AccountsPage from "./components/AccountsPage";
import ReportsPage from "./components/ReportsPage";
import NotesPage from "./components/NotesPage";
import ContactsPage from "./components/ContactsPage";
import BusinessRequestsPage from "./components/BusinessRequestsPage";
import { ensureOwnerBusiness, listPendingRequests, myMembership, myRequestStatus, type Membership } from "./lib/cloud";
import WaitingScreen from "./components/WaitingScreen";
import SettingsPage from "./components/SettingsPage";
import SupportPage from "./components/SupportPage";
import PrivacyPage from "./components/PrivacyPage";
import PlansPage from "./components/PlansPage";
import NewBusinessPage from "./components/NewBusinessPage";
import JoinBusinessPage from "./components/JoinBusinessPage";
import { activeWorkspace, MAIN_WORKSPACE } from "./lib/storage";
import type { TabInfo } from "./components/PartyTabs";
import {
  BUILTIN_GROUPS,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  balanceOf,
  initialAccounts,
  initialCustomers,
  initialNotes,
  initialSuppliers,
  initialTransactions,
  type AccountId,
  type Customer,
  type Group,
  type PartyKind,
  type Transaction,
} from "./data/mock";
import { setHapticsEnabled } from "./lib/haptics";
import type { MenuPage } from "./lib/menu";
import { useSwipeBack } from "./lib/useSwipeBack";
import { setCurrency } from "./lib/format";
import { t } from "./lib/i18n";
import AuthScreen from "./components/AuthScreen";
import { cloudEnabled, heartbeat, loadSession, readRecoveryToken, signOut, type Session } from "./lib/cloud";
import { useCloudSync } from "./lib/useCloudSync";
import { clearStored, usePersistedState } from "./lib/storage";

// Açılış ekranı ne kadar görünsün (ms) ve çıkış animasyonunun süresi
const SPLASH_DURATION = 2200;
const SPLASH_EXIT = 400;


/** Açık olan ekran. Tüm sekmeler (müşteriler, tedarikçiler, özel sekmeler) ana ekranda açılır. */
type View =
  | { name: "home" }
  | { name: "kasa"; account?: AccountId; back?: View }
  | { name: "menu"; page: MenuPage }
  | { name: "edit"; id: string; back: View }
  | { name: "party"; id: string; back?: View }
  | { name: "new"; kind: PartyKind };

export default function App() {
  const [phase, setPhase] = useState<"splash" | "exiting" | "home">("splash");
  const [view, setView] = useState<View>({ name: "home" });
  // Sekmeler: Müşteriler, Tedarikçiler ve kullanıcının açtıkları
  const [groups, setGroups] = usePersistedState<Group[]>("groups", BUILTIN_GROUPS);
  // Ana ekranda hangi sekmenin listesi gösteriliyor; sayfalar arası gidip gelince korunur
  const [activeTab, setActiveTab] = useState<PartyKind>("customer");
  // Tüm kayıtlar tek listede tutulur; "kind" hangi sekmeye ait olduğunu belirtir
  const [parties, setParties] = usePersistedState<Customer[]>("parties", [
    ...initialCustomers,
    ...initialSuppliers,
  ]);
  const [transactions, setTransactions] = usePersistedState<Transaction[]>(
    "transactions",
    initialTransactions,
  );
  const [accounts, setAccounts] = usePersistedState("accounts", initialAccounts);
  const [profile, setProfile] = usePersistedState("profile", DEFAULT_PROFILE);
  const [notes, setNotes] = usePersistedState("notes", initialNotes);
  const [readIds, setReadIds] = usePersistedState<string[]>("readIds", []);
  const [storedSettings, setSettings] = usePersistedState("settings", DEFAULT_SETTINGS);
  // Eski kayıtlarda bulunmayan alanlar varsayılanla tamamlanır
  const settings = { ...DEFAULT_SETTINGS, ...storedSettings };
  // Alt bileşenler çizilmeden önce para birimi biçimi güncellenir
  setCurrency(settings.currency);
  // Yazı boyutu kök yazı boyutunu değiştirir; tüm metinler rem ile ölçeklenir
  document.documentElement.style.fontSize = { small: "13px", medium: "16px", large: "20px" }[settings.textSize] ?? "16px";
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Hesap ve bulut eşitleme: Supabase tanımlıysa giriş gerekir; değilse uygulama yalnızca bu cihazda çalışır
  const [session, setSession] = useState<Session | null>(() => (cloudEnabled ? loadSession() : null));
  // E-postadaki şifre sıfırlama bağlantısından gelindiyse yeni şifre ekranı açılır
  const [recoveryToken, setRecoveryToken] = useState<string | null>(() => (cloudEnabled ? readRecoveryToken() : null));
  // Titreşim cihaza özgüdür; diğer ayarlar hesapla birlikte eşitlenir
  const syncSettings = (all: typeof settings) => {
    const { haptics: _haptics, ...rest } = all;
    void _haptics;
    return rest;
  };
  const snapshot = {
    groups,
    parties,
    transactions,
    accounts,
    profile,
    notes,
    readIds,
    settings: syncSettings(settings),
  };
  // Açık cihazı sunucuya bildirir: açılışta, sonra dakikada bir ve uygulama öne gelince
  useEffect(() => {
    if (!session) return;
    const beat = () => {
      if (document.visibilityState !== "visible") return;
      heartbeat(session).then((r) => r === "expired" && setSession(null)).catch(() => undefined);
    };
    beat();
    const timer = window.setInterval(beat, 60_000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [session]);

  // Bulut eşitlemesi yalnızca ana işletmede çalışır; yeni işletmenin verisi ana verinin üzerine yazılmaz
  const isMainWorkspace = activeWorkspace() === MAIN_WORKSPACE;
  // Üyelik: undefined = henüz kontrol edilmedi, null = işletmesi yok
  const [membership, setMembership] = useState<Membership | null | undefined>(undefined);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [recheck, setRecheck] = useState(0);
  const memberReady = !isMainWorkspace || membership !== undefined;
  const waiting = isMainWorkspace && !!session && membership === null && requestStatus !== null;
  const sync = useCloudSync({
    session: isMainWorkspace && memberReady && !waiting ? session : null,
    businessId: membership?.businessId ?? null,
    snapshot,
    onExpired: () => setSession(null),
    apply: (d) => {
      const nextGroups = Array.isArray(d.groups) ? (d.groups as Group[]) : BUILTIN_GROUPS;
      const nextParties = Array.isArray(d.parties) ? (d.parties as Customer[]) : [];
      const nextTx = Array.isArray(d.transactions) ? (d.transactions as Transaction[]) : [];
      const nextAccounts = Array.isArray(d.accounts) ? (d.accounts as typeof accounts) : initialAccounts;
      const nextProfile = { ...DEFAULT_PROFILE, ...(d.profile as object) };
      const nextNotes = Array.isArray(d.notes) ? (d.notes as typeof notes) : [];
      const nextRead = Array.isArray(d.readIds) ? (d.readIds as string[]) : [];
      const nextSettings = { ...DEFAULT_SETTINGS, ...(d.settings as object), haptics: settings.haptics };
      setGroups(nextGroups);
      setParties(nextParties);
      setTransactions(nextTx);
      setAccounts(nextAccounts);
      setProfile(nextProfile);
      setNotes(nextNotes);
      setReadIds(nextRead);
      setSettings(nextSettings);
      return {
        groups: nextGroups,
        parties: nextParties,
        transactions: nextTx,
        accounts: nextAccounts,
        profile: nextProfile,
        notes: nextNotes,
        readIds: nextRead,
        settings: syncSettings({ ...DEFAULT_SETTINGS, ...nextSettings }),
      };
    },
  });

  /** Yeni hesap boş bir çalışma alanıyla başlar (örnek veriler yalnızca yerel denemede görünür) */
  function emptyWorkspace(name: string) {
    setGroups(BUILTIN_GROUPS);
    setParties([]);
    setTransactions([]);
    setAccounts(initialAccounts.map((a) => ({ ...a, opening: 0 })));
    setProfile({ ...DEFAULT_PROFILE, name, owner: "", logo: "" });
    setNotes([]);
    setReadIds([]);
    setActiveTab("customer");
  }

  function logout() {
    signOut();
    clearStored();
    emptyWorkspace("");
    setDrawerOpen(false);
    setView({ name: "home" });
    setSession(null);
  }
  // Az önce eklenen kayıt; listede vurgulanır
  const [addedId, setAddedId] = useState<string | null>(null);

  useSwipeBack(phase === "home");

  useEffect(() => setHapticsEnabled(settings.haptics), [settings.haptics]);

  // Sahibin işletmesi sunucuda yoksa oluşturulur; ardından üyelik ve istek durumu okunur
  useEffect(() => {
    if (!session || !isMainWorkspace) return;
    let alive = true;
    (async () => {
      await ensureOwnerBusiness(session, profile.name).catch(() => undefined);
      const m = await myMembership(session).catch(() => null);
      if (m === "expired") {
        setSession(null);
        return;
      }
      const st = m ? null : await myRequestStatus(session).catch(() => null);
      if (!alive) return;
      setMembership(m);
      setRequestStatus(st === "expired" ? null : st);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, recheck]);

  // Menüdeki Bildirimler rozeti: yetkili olunan işletmelerdeki bekleyen katılma istekleri
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    if (!session) return;
    let alive = true;
    const check = () =>
      listPendingRequests(session)
        .then((res) => alive && Array.isArray(res) && setPendingCount(res.length))
        .catch(() => undefined);
    void check();
    const timer = window.setInterval(check, 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [session]);

  useEffect(() => {
    const exit = window.setTimeout(() => setPhase("exiting"), SPLASH_DURATION);
    const done = window.setTimeout(
      () => setPhase("home"),
      SPLASH_DURATION + SPLASH_EXIT,
    );
    return () => {
      window.clearTimeout(exit);
      window.clearTimeout(done);
    };
  }, []);

  if (phase !== "home") {
    return (
      <div className={`splash-wrap ${phase === "exiting" ? "is-exiting" : ""}`}>
        <Splash />
      </div>
    );
  }

  if (cloudEnabled && !session) {
    return (
      <AuthScreen
        recoveryToken={recoveryToken}
        onRecoveryDone={() => {
          setRecoveryToken(null);
          window.history.replaceState(null, "", window.location.pathname);
        }}
        onSession={(next, info) => {
          if (info?.isNew) emptyWorkspace(info.businessName);
          setSession(next);
          setView({ name: "home" });
        }}
      />
    );
  }

  // Yükleme ekranı yalnızca ana işletmede, bulut verisi beklenirken gösterilir
  if (session && isMainWorkspace && waiting) {
    return <WaitingScreen status={requestStatus} onRecheck={() => setRecheck((n) => n + 1)} onLogout={logout} />;
  }

  if (session && isMainWorkspace && !memberReady) {
    return <div className="sync-loading">{t("Verileriniz getiriliyor…")}</div>;
  }

  if (session && isMainWorkspace && !sync.ready) {
    return <div className="sync-loading">{t("Verileriniz getiriliyor…")}</div>;
  }

  // Silinmiş bir sekme etkin kalmasın
  const currentTab = groups.some((g) => g.id === activeTab)
    ? activeTab
    : "customer";
  const membersOf = (kind: PartyKind) => parties.filter((p) => p.kind === kind);
  const tabs: TabInfo[] = groups.map((g) => {
    const members = membersOf(g.id);
    return {
      id: g.id,
      name: g.name,
      count: members.length,
      total: members.reduce((sum, m) => sum + balanceOf(transactions, m.id), 0),
    };
  });

  const backupText = JSON.stringify(
    { version: 1, groups, parties, transactions, accounts, profile, notes, readIds, settings },
    null,
    2,
  );

  /** Yedek metnini doğrular ve yükler; hata varsa mesajını döndürür */
  function restore(text: string): string | null {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      return t("Metin geçerli bir yedek değil.");
    }
    if (
      !data ||
      data.version !== 1 ||
      !Array.isArray(data.groups) ||
      !Array.isArray(data.parties) ||
      !Array.isArray(data.transactions) ||
      !Array.isArray(data.accounts)
    ) {
      return t("Bu bir Hesabım yedeği gibi görünmüyor.");
    }
    setGroups(data.groups as Group[]);
    setParties(data.parties as Customer[]);
    setTransactions(data.transactions as Transaction[]);
    setAccounts(data.accounts as typeof accounts);
    setProfile({ ...DEFAULT_PROFILE, ...(data.profile as object) });
    setNotes(Array.isArray(data.notes) ? (data.notes as typeof notes) : []);
    setReadIds(Array.isArray(data.readIds) ? (data.readIds as string[]) : []);
    setSettings({ ...DEFAULT_SETTINGS, ...(data.settings as object) });
    setActiveTab("customer");
    return null;
  }

  function resetAll() {
    clearStored();
    setGroups(BUILTIN_GROUPS);
    setParties([...initialCustomers, ...initialSuppliers]);
    setTransactions(initialTransactions);
    setAccounts(initialAccounts);
    setProfile(DEFAULT_PROFILE);
    setNotes(initialNotes);
    setReadIds([]);
    setSettings(DEFAULT_SETTINGS);
    setActiveTab("customer");
  }

  function go(next: View) {
    setAddedId(null);
    setView(next);
  }

  /** Sekme değişince ekran aynı kalır; yalnızca alttaki liste değişir */
  function openTab(id: PartyKind) {
    setAddedId(null);
    setActiveTab(id);
  }

  /** Yeni sekme oluştur ve listesini göster */
  function createTab(name: string) {
    const group: Group = { id: `g${Date.now()}`, name };
    setGroups((prev) => [...prev, group]);
    openTab(group.id);
  }

  function renameTab(id: PartyKind, name: string) {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)));
  }

  /**
   * Sekmeyi, içindeki kayıtları ve bu kayıtların işlemlerini siler.
   * Müşteriler ana ekranın parçası olduğu için sekme kalır, yalnızca içi boşaltılır.
   */
  function deleteTab(id: PartyKind) {
    const doomed = new Set(parties.filter((p) => p.kind === id).map((p) => p.id));
    setParties((prev) => prev.filter((p) => p.kind !== id));
    setTransactions((prev) => prev.filter((t) => !doomed.has(t.customerId)));
    if (id === "customer") return;
    setGroups((prev) => prev.filter((g) => g.id !== id));
    if (activeTab === id) setActiveTab("customer");
  }

  if (view.name === "new") {
    const kind = view.kind;
    const group = groups.find((g) => g.id === kind);
    return (
      <NewCustomerPage
        kind={kind}
        groupName={t(group?.name ?? "")}
        existingNames={membersOf(kind).map((p) => p.name)}
        onBack={() => setView({ name: "home" })}
        onSave={(party) => {
          setParties((prev) => [...prev, party]);
          setAddedId(party.id);
          setActiveTab(kind);
          setView({ name: "home" });
        }}
      />
    );
  }

  if (view.name === "edit") {
    const party = parties.find((p) => p.id === view.id);
    if (party) {
      const back = view.back;
      return (
        <NewCustomerPage
          kind={party.kind}
          groupName={t(groups.find((g) => g.id === party.kind)?.name ?? "")}
          existingNames={membersOf(party.kind)
            .filter((p) => p.id !== party.id)
            .map((p) => p.name)}
          initial={party}
          onBack={() => go(back)}
          onSave={(updated) => {
            setParties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            go(back);
          }}
        />
      );
    }
  }

  if (view.name === "kasa") {
    return (
      <KasaPage
        accounts={accounts}
        initialAccount={view.account}
        parties={parties}
        transactions={transactions}
        onBack={() => go(view.back ?? { name: "home" })}
      />
    );
  }

  if (view.name === "menu") {
    const menu: View = { name: "menu", page: view.page };
    const toHome = () => go({ name: "home" });
    const openParty = (id: string) => go({ name: "party", id, back: menu });
    switch (view.page) {
      case "profile":
        return <ProfilePage profile={profile} onSave={setProfile} onBack={toHome} />;
      case "accounts":
        return (
          <AccountsPage
            accounts={accounts}
            transactions={transactions}
            onUpdateOpening={(id, opening) =>
              setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, opening } : a)))
            }
            onOpenKasa={(id) => go({ name: "kasa", account: id, back: menu })}
            onBack={toHome}
          />
        );
      case "reports":
        return (
          <ReportsPage
            parties={parties}
            transactions={transactions}
            accounts={accounts}
            businessName={profile.name}
            onOpenParty={openParty}
            onBack={toHome}
          />
        );
      case "notes":
        return <NotesPage notes={notes} onChange={setNotes} onBack={toHome} />;
      case "contacts":
        return (
          <ContactsPage
            parties={parties}
            groups={groups}
            onUpdateParty={(id, patch) =>
              setParties((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
            }
            onOpenParty={openParty}
            onNewParty={(kind) => {
              setActiveTab(kind);
              go({ name: "new", kind });
            }}
            onBack={toHome}
          />
        );
      case "notifications":
        return (
          <BusinessRequestsPage onBack={toHome} />
        );
      case "settings":
        return (
          <SettingsPage
            settings={settings}
            backupText={backupText}
            onChange={setSettings}
            account={
              session
                ? {
                    email: session.email,
                    session,
                    status: sync.status,
                    lastSync: sync.lastSync,
                    onSync: sync.syncNow,
                    onSignOut: logout,
                  }
                : undefined
            }
            onRestore={restore}
            onReset={resetAll}
            onBack={toHome}
          />
        );
      case "privacy":
        return <PrivacyPage onBack={toHome} />;
      case "plans":
        return <PlansPage profile={profile} onBack={toHome} />;
      case "newbusiness":
        return <NewBusinessPage onBack={toHome} onJoin={() => go({ name: "menu", page: "join" })} />;
      case "join":
        return <JoinBusinessPage onBack={toHome} />;
      case "support":
        return (
          <SupportPage
            supportEmail={settings.supportEmail}
            diagnostics={t("Hesabım • {p} kişi, {x} işlem, {n} not • {ua}", { p: parties.length, x: transactions.length, n: notes.length, ua: navigator.userAgent })}
            onOpenSettings={() => go({ name: "menu", page: "settings" })}
            onBack={toHome}
          />
        );
    }
  }

  if (view.name === "party") {
    const party = parties.find((p) => p.id === view.id);
    if (party) {
      return (
        <CustomerPage
          customer={party}
          profile={profile}
          accounts={accounts}
          transactions={transactions}
          onAdd={(tx) => setTransactions((prev) => [...prev, tx])}
          onUpdate={(tx) =>
            setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)))
          }
          onDelete={(id) =>
            setTransactions((prev) => prev.filter((t) => t.id !== id))
          }
          onEdit={() => go({ name: "edit", id: party.id, back: view })}
          onDeleteParty={() => {
            setParties((prev) => prev.filter((p) => p.id !== party.id));
            setTransactions((prev) => prev.filter((t) => t.customerId !== party.id));
            go(view.back?.name === "menu" ? view.back : { name: "home" });
          }}
          onBack={() => go(view.back ?? { name: "home" })}
        />
      );
    }
  }

  return (
    <>
    <Dashboard
      profile={profile}
      accounts={accounts}
      onOpenMenu={() => setDrawerOpen(true)}
      onOpenKasa={() => go({ name: "kasa" })}
      onOpenPlans={() => go({ name: "menu", page: "newbusiness" })}
      parties={parties}
      members={membersOf(currentTab)}
      activeTab={currentTab}
      tabs={tabs}
      transactions={transactions}
      highlightId={addedId}
      onSelectParty={(id) => go({ name: "party", id })}
      onNewParty={() => go({ name: "new", kind: currentTab })}
      onSelectTab={openTab}
      onCreateTab={createTab}
      onRenameTab={renameTab}
      onDeleteTab={deleteTab}
    />
    {drawerOpen && (
      <MenuDrawer
        profile={profile}
        unread={pendingCount}
        onNavigate={(page) => {
          setDrawerOpen(false);
          go({ name: "menu", page });
        }}
        onClose={() => setDrawerOpen(false)}
      />
    )}
    </>
  );
}
