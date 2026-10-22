import { useEffect, useMemo, useState } from "react";
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
import NotificationsPage from "./components/NotificationsPage";
import SettingsPage from "./components/SettingsPage";
import SupportPage from "./components/SupportPage";
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
import { buildNotifications } from "./lib/notifications";
import { useSwipeBack } from "./lib/useSwipeBack";
import { clearStored, usePersistedState } from "./lib/storage";

// Açılış ekranı ne kadar görünsün (ms) ve çıkış animasyonunun süresi
const SPLASH_DURATION = 2200;
const SPLASH_EXIT = 400;

/** Açık olan ekran. Tüm sekmeler (müşteriler, tedarikçiler, özel sekmeler) ana ekranda açılır. */
type View =
  | { name: "home" }
  | { name: "kasa"; account?: AccountId; back?: View }
  | { name: "menu"; page: MenuPage }
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
  const [settings, setSettings] = usePersistedState("settings", DEFAULT_SETTINGS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Az önce eklenen kayıt; listede vurgulanır
  const [addedId, setAddedId] = useState<string | null>(null);

  useSwipeBack(phase === "home");

  useEffect(() => setHapticsEnabled(settings.haptics), [settings.haptics]);

  // Bildirimler verilerden ve limitlerden üretilir; gün değişince yenilenir
  const today = new Date().toDateString();
  const notifications = useMemo(
    () => buildNotifications(parties, transactions, accounts, settings, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parties, transactions, accounts, settings, today],
  );
  const unread = notifications.filter((n) => !readIds.includes(n.id)).length;

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
      return "Metin geçerli bir yedek değil.";
    }
    if (
      !data ||
      data.version !== 1 ||
      !Array.isArray(data.groups) ||
      !Array.isArray(data.parties) ||
      !Array.isArray(data.transactions) ||
      !Array.isArray(data.accounts)
    ) {
      return "Bu bir Hesabım yedeği gibi görünmüyor.";
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
        groupName={group?.name ?? ""}
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
          <NotificationsPage
            notifications={notifications}
            readIds={readIds}
            onRead={(id) => setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]))}
            onReadAll={() => setReadIds(notifications.map((n) => n.id))}
            onOpenParty={openParty}
            onOpenSettings={() => go({ name: "menu", page: "settings" })}
            onBack={toHome}
          />
        );
      case "settings":
        return (
          <SettingsPage
            settings={settings}
            backupText={backupText}
            onChange={setSettings}
            onRestore={restore}
            onReset={resetAll}
            onBack={toHome}
          />
        );
      case "support":
        return (
          <SupportPage
            supportEmail={settings.supportEmail}
            diagnostics={`Hesabım • ${parties.length} kişi, ${transactions.length} işlem, ${notes.length} not • ${navigator.userAgent}`}
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
          accounts={accounts}
          transactions={transactions}
          onAdd={(tx) => setTransactions((prev) => [...prev, tx])}
          onUpdate={(tx) =>
            setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)))
          }
          onDelete={(id) =>
            setTransactions((prev) => prev.filter((t) => t.id !== id))
          }
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
      onOpenKasa={() => go({ name: "kasa" })}
    />
    {drawerOpen && (
      <MenuDrawer
        profile={profile}
        unread={unread}
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
