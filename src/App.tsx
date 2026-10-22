import { useEffect, useState } from "react";
import Splash from "./components/Splash";
import Dashboard from "./components/Dashboard";
import CustomerPage from "./components/CustomerPage";
import NewCustomerPage from "./components/NewCustomerPage";
import type { TabInfo } from "./components/PartyTabs";
import {
  BUILTIN_GROUPS,
  balanceOf,
  initialCustomers,
  initialSuppliers,
  initialTransactions,
  type Customer,
  type Group,
  type PartyKind,
  type Transaction,
} from "./data/mock";

// Açılış ekranı ne kadar görünsün (ms) ve çıkış animasyonunun süresi
const SPLASH_DURATION = 2200;
const SPLASH_EXIT = 400;

/** Açık olan ekran. Tüm sekmeler (müşteriler, tedarikçiler, özel sekmeler) ana ekranda açılır. */
type View =
  | { name: "home" }
  | { name: "party"; id: string }
  | { name: "new"; kind: PartyKind };

export default function App() {
  const [phase, setPhase] = useState<"splash" | "exiting" | "home">("splash");
  const [view, setView] = useState<View>({ name: "home" });
  // Sekmeler: Müşteriler, Tedarikçiler ve kullanıcının açtıkları
  const [groups, setGroups] = useState<Group[]>(BUILTIN_GROUPS);
  // Ana ekranda hangi sekmenin listesi gösteriliyor; sayfalar arası gidip gelince korunur
  const [activeTab, setActiveTab] = useState<PartyKind>("customer");
  // Tüm kayıtlar tek listede tutulur; "kind" hangi sekmeye ait olduğunu belirtir
  const [parties, setParties] = useState<Customer[]>([
    ...initialCustomers,
    ...initialSuppliers,
  ]);
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  // Az önce eklenen kayıt; listede vurgulanır
  const [addedId, setAddedId] = useState<string | null>(null);

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

  if (view.name === "party") {
    const party = parties.find((p) => p.id === view.id);
    if (party) {
      return (
        <CustomerPage
          customer={party}
          transactions={transactions}
          onAdd={(tx) => setTransactions((prev) => [...prev, tx])}
          onUpdate={(tx) =>
            setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)))
          }
          onDelete={(id) =>
            setTransactions((prev) => prev.filter((t) => t.id !== id))
          }
          onBack={() => go({ name: "home" })}
        />
      );
    }
  }

  return (
    <Dashboard
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
  );
}
