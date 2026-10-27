import { useEffect, useRef, useState } from "react";
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
import { ensureOwnerBusiness, listChangeNotices, listPendingRequests, myBusinesses, myMembership, myRequestStatus, type Membership, type MyBusiness } from "./lib/cloud";
import WaitingScreen from "./components/WaitingScreen";
import SettingsPage from "./components/SettingsPage";
import SupportPage from "./components/SupportPage";
import PrivacyPage from "./components/PrivacyPage";
import PlansPage from "./components/PlansPage";
import TermsPage from "./components/TermsPage";
import ArchivePage from "./components/ArchivePage";
import NewBusinessPage from "./components/NewBusinessPage";
import JoinBusinessPage from "./components/JoinBusinessPage";
import TeamPage from "./components/TeamPage";
import TeamMemberPage from "./components/TeamMemberPage";
import type { TeamPerson } from "./lib/cloud";
import { renameBusiness } from "./lib/cloud";
import { migrateLocalWorkspaces } from "./lib/migrate";
import { canAddItem, canAddTab } from "./lib/plan";
import { deleteMyAccount, pull } from "./lib/cloud";
import { businessList, listWorkspaces } from "./lib/storage";
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



/** Açık olan ekran. Tüm sekmeler (müşteriler, tedarikçiler, özel sekmeler) ana ekranda açılır. */
type View =
  | { name: "home" }
  | { name: "kasa"; account?: AccountId; back?: View }
  | { name: "menu"; page: MenuPage }
  | { name: "edit"; id: string; back: View }
  | { name: "party"; id: string; back?: View }
  | { name: "new"; kind: PartyKind };

export default function App() {
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

  // Çalışma alanı: ana işletme, sunucudaki bir ortak işletme ya da yalnızca bu cihazdaki (eski) bir işletme
  const [serverBiz, setServerBiz] = useState<MyBusiness[] | null>(null);
  const activeId = activeWorkspace();
  // Yerel işletme taşındıysa sunucudaki karşılığı kullanılır
  const localWs = listWorkspaces().find((w) => w.id === activeId);
  const serverKey = serverBiz?.some((b) => b.businessId === activeId) ? activeId : localWs?.serverId;
  const serverMine = serverBiz?.find((b) => b.businessId === serverKey) ?? null;
  const wsKind: "main" | "server" | "local" | "pending" =
    activeId === MAIN_WORKSPACE ? "main" : serverBiz === null ? "pending" : serverMine ? "server" : "local";
  const isMainWorkspace = wsKind === "main";
  const serverWs = wsKind === "main" || wsKind === "server";
  // Üyelik: undefined = henüz kontrol edilmedi, null = işletmesi yok (ana işletme için)
  const [membership, setMembership] = useState<Membership | null | undefined>(undefined);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [recheck, setRecheck] = useState(0);
  // Ekiplerim: seçili üye (detay sayfası için)
  const [teamPerson, setTeamPerson] = useState<TeamPerson | null>(null);
  const effMembership: Membership | null | undefined =
    wsKind === "server" && serverMine ? { businessId: serverMine.businessId, role: serverMine.role } : membership;
  const memberReady =
    wsKind === "local" ? true : wsKind === "pending" ? false : effMembership !== undefined;
  // Yeni işletme yalnızca yetkili (sahip) tarafından açılabilir
  const canCreateBusiness = wsKind === "local" || effMembership === null || effMembership?.role === "owner";
  const waiting = isMainWorkspace && !!session && membership === null && requestStatus !== null;
  // Ekip üyesinin listesinde, bu cihazın ana işletmesi dışında kalan ortak işletmeler
  const serverBusinesses = (serverBiz ?? [])
    .filter((b) => b.role === "member" && b.businessId !== membership?.businessId)
    .map((b) => ({ id: b.businessId, name: b.name }));
  // Tüm verileri sıfırlayınca eşitleme duraklar; uygulama yeniden açılınca devam eder
  // Duraklatma yeniden açılışlarda da korunur; yalnızca hesaptan çekilince ya da çıkış yapınca kalkar
  const PAUSE_KEY = "hesabim:sync-paused";
  const [syncPaused, setSyncPausedState] = useState(() => {
    try {
      return localStorage.getItem(PAUSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const setSyncPaused = (paused: boolean) => {
    try {
      if (paused) localStorage.setItem(PAUSE_KEY, "1");
      else localStorage.removeItem(PAUSE_KEY);
    } catch {
      /* depolama erişilemiyorsa yalnızca oturum boyunca geçerli */
    }
    setSyncPausedState(paused);
  };
  const sync = useCloudSync({
    session: serverWs && memberReady && !waiting && !syncPaused ? session : null,
    businessId: effMembership?.businessId ?? null,
    canSeed: effMembership?.role === "owner",
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
    setSyncPaused(false);
    signOut();
    clearStored();
    emptyWorkspace("");
    setDrawerOpen(false);
    setView({ name: "home" });
    setSession(null);
  }
  // Hesabı ve tüm verileri siler; yerel veriler de temizlenir
  async function deleteAccountNow() {
    if (!session) return;
    try {
      const r = await deleteMyAccount(session);
      if (r === "expired") {
        window.alert(t("Oturumunuz sona ermiş; yeniden giriş yapıp tekrar deneyin."));
        return;
      }
    } catch {
      window.alert(t("Hesap silinemedi; bağlantınızı kontrol edip tekrar deneyin."));
      return;
    }
    signOut();
    Object.keys(localStorage)
      .filter((k) => k.startsWith("hesabim:"))
      .forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  }

  // Az önce eklenen kayıt; listede vurgulanır
  const [addedId, setAddedId] = useState<string | null>(null);

  useSwipeBack(true);

  useEffect(() => setHapticsEnabled(settings.haptics), [settings.haptics]);

  // Giriş yapan kişinin tüm ortak işletmeleri (sahip ve üye olarak)
  useEffect(() => {
    if (!session) return;
    let alive = true;
    myBusinesses(session)
      .then((r) => {
        if (alive && Array.isArray(r)) setServerBiz(r);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [session, recheck]);

  // Bu cihazdaki yerel işletmeler (sunucuda yoksa) bir kez sunucuya taşınır
  const migratedRef = useRef(false);
  useEffect(() => {
    if (!session || !serverBiz || migratedRef.current) return;
    migratedRef.current = true;
    void migrateLocalWorkspaces(session, serverBiz.map((b) => b.businessId))
      .then((changed) => {
        if (changed) setRecheck((n) => n + 1);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, serverBiz]);

  // Sahibin işletmesinin sunucudaki adı, yerelde girilen işletme adıyla eşitlenir (ekip listesinde görünür)
  useEffect(() => {
    if (!session || effMembership?.role !== "owner" || !profile.name.trim()) return;
    void renameBusiness(session, effMembership.businessId, profile.name).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, effMembership?.businessId, effMembership?.role, profile.name]);

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
      Promise.all([listPendingRequests(session), listChangeNotices(session)])
        .then(([reqs, changes]) => {
          if (!alive) return;
          const r = Array.isArray(reqs) ? reqs.length : 0;
          const c = Array.isArray(changes) ? changes.length : 0;
          setPendingCount(r + c);
        })
        .catch(() => undefined);
    void check();
    const timer = window.setInterval(check, 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [session]);


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
  if (session && serverWs && waiting) {
    return <WaitingScreen status={requestStatus} onRecheck={() => setRecheck((n) => n + 1)} onLogout={logout} />;
  }

  if (session && wsKind === "pending") {
    return <div className="sync-loading">{t("Verileriniz getiriliyor…")}</div>;
  }

  if (session && serverWs && !memberReady) {
    return <div className="sync-loading">{t("Verileriniz getiriliyor…")}</div>;
  }

  // Eşitleme duraklatılmışsa (tüm verileri sil sonrası) yükleme ekranı beklenmez
  if (session && serverWs && !sync.ready && !syncPaused) {
    return <div className="sync-loading">{t("Verileriniz getiriliyor…")}</div>;
  }

  // Silinmiş bir sekme etkin kalmasın
  const currentTab = groups.some((g) => g.id === activeTab)
    ? activeTab
    : "customer";
  // Arşivdeki kayıtlar ana listede görünmez; analizler ise tüm kayıtları kullanmaya devam eder
  const membersOf = (kind: PartyKind) => parties.filter((p) => p.kind === kind && !p.archived);
  function setArchived(id: string, archived: boolean) {
    setParties((prev) => prev.map((p) => (p.id === id ? { ...p, archived: archived || undefined } : p)));
  }
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

  /** Hesaptaki veriyi çekip bu cihaza geri yükler; eşitleme duraklamışsa yeniden başlatır */
  /** Sunucudaki kaydın durumunu kısa metin olarak döner (tanılama için) */
  async function remoteStatus(): Promise<string> {
    if (!session) return t("Giriş yapılmadı");
    const remote = await pull(session, effMembership?.businessId ?? null);
    if (remote === "expired") return t("Oturum süresi dolmuş; yeniden giriş yapın");
    if (!remote) return t("Sunucuda kayıtlı veri yok");
    return t("Sunucuda kayıtlı veri var · son güncelleme {d}", { d: new Date(remote.updatedAt).toLocaleString("tr-TR") });
  }

  async function restoreFromAccount(): Promise<string | null> {
    if (!session) return t("Hesaba giriş yapılmamış.");
    const remote = await pull(session, effMembership?.businessId ?? null);
    if (remote === "expired") return t("Oturumunuzun süresi doldu, yeniden giriş yapın.");
    if (!remote) return t("Hesapta kayıtlı veri yok.");
    // Bulut verisi sürüm alanı olmadan saklanır; geri yükleme için sürüm eklenir
    const error = restore(JSON.stringify({ version: 1, ...remote.data }));
    if (!error) setSyncPaused(false);
    return error;
  }

  // Yalnızca bu cihazdaki veriyi siler; hesap açık kalır. Eşitleme duraklatılır ki boş veri buluta yazılmasın
  // ve silinen veri hemen geri gelmesin. Uygulama yeniden açılınca hesaptaki veri tekrar çekilir.
  function resetAll() {
    clearStored();
    if (session) setSyncPaused(true);
    // Sekmeler kalır, kayıtlar ve notlar boşalır; hesaplar sıfır bakiyeyle açılır
    setGroups(BUILTIN_GROUPS);
    setParties([]);
    setTransactions([]);
    setAccounts(initialAccounts.map((a) => ({ ...a, opening: 0 })));
    setProfile({ ...DEFAULT_PROFILE, name: "", owner: "" });
    setNotes([]);
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
    if (!canAddTab(groups.length)) {
      go({ name: "menu", page: "plans" });
      return;
    }
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
      case "archive":
        return <ArchivePage parties={parties} groups={groups} onRestore={(id) => setArchived(id, false)} onBack={toHome} />;
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
              if (!canAddItem(membersOf(kind).length)) {
                go({ name: "menu", page: "plans" });
                return;
              }
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
                    onDeleteAccount: deleteAccountNow,
                  }
                : undefined
            }
            onRestore={restore}
            onReset={resetAll}
            onRestoreFromAccount={restoreFromAccount}
            onRemoteStatus={remoteStatus}
            onBack={toHome}
            onOpenPrivacy={() => go({ name: "menu", page: "privacy" })}
            onOpenTerms={() => go({ name: "menu", page: "terms" })}
            onOpenSupport={() => go({ name: "menu", page: "support" })}
          />
        );
      case "privacy":
        return <PrivacyPage onBack={toHome} />;
      case "terms":
        return <TermsPage onBack={toHome} />;
      case "plans":
        return <PlansPage onBack={toHome} onPrivacy={() => go({ name: "menu", page: "privacy" })} onTerms={() => go({ name: "menu", page: "terms" })} />;
      case "newbusiness":
        return <NewBusinessPage onBack={toHome} onJoin={() => go({ name: "menu", page: "join" })} />;
      case "team":
        if (session && teamPerson) {
          return (
            <TeamMemberPage
              session={session}
              person={teamPerson}
              onBack={() => setTeamPerson(null)}
              onRemoved={() => setTeamPerson(null)}
            />
          );
        }
        return session ? (
          <TeamPage session={session} onOpen={setTeamPerson} onPlans={() => go({ name: "menu", page: "plans" })} onBack={toHome} />
        ) : null;
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
      listSort={settings.listSort}
      onOpenKasa={() => go({ name: "kasa" })}
      onOpenPlans={() => go({ name: "menu", page: "newbusiness" })}
      onPlans={() => go({ name: "menu", page: "plans" })}
      serverBusinesses={serverBusinesses}
      canCreateBusiness={canCreateBusiness}
      parties={parties}
      members={membersOf(currentTab)}
      activeTab={currentTab}
      tabs={tabs}
      transactions={transactions}
      highlightId={addedId}
      onSelectParty={(id) => go({ name: "party", id })}
      onArchive={(id) => setArchived(id, true)}
      onDeleteParty={(id) => {
        setParties((prev) => prev.filter((p) => p.id !== id));
        setTransactions((prev) => prev.filter((t) => t.customerId !== id));
      }}
      onNewParty={() => {
        if (!canAddItem(membersOf(currentTab).length)) {
          go({ name: "menu", page: "plans" });
          return;
        }
        go({ name: "new", kind: currentTab });
      }}
      onSelectTab={openTab}
      onCreateTab={createTab}
      onRenameTab={renameTab}
      onDeleteTab={deleteTab}
    />
    {drawerOpen && (
      <MenuDrawer
        unread={pendingCount}
        businesses={businessList(serverBusinesses)}
        canCreateBusiness={canCreateBusiness}
        onNavigate={(page) => {
          setDrawerOpen(false);
          go({ name: "menu", page });
        }}
        onClose={() => setDrawerOpen(false)}
        onSignOut={session ? logout : undefined}
      />
    )}
    </>
  );
}
