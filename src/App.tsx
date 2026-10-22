import { useEffect, useState } from "react";
import Splash from "./components/Splash";
import Dashboard from "./components/Dashboard";
import CustomerPage from "./components/CustomerPage";
import GroupPage from "./components/GroupPage";
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

/** Açık olan ekran. Müşteriler ana ekranda, diğer sekmeler kendi sayfalarında açılır. */
type View =
  | { name: "home" }
  | { name: "group"; id: PartyKind }
  | { name: "party"; id: string; fromGroup: PartyKind }
  | { name: "new"; kind: PartyKind };

export default function App() {
  const [phase, setPhase] = useState<"splash" | "exiting" | "home">("splash");
  const [view, setView] = useState<View>({ name: "home" });
  // Sekmeler: Müşteriler, Tedarikçiler ve kullanıcının açtıkları
  const [groups, setGroups] = useState<Group[]>(BUILTIN_GROUPS);
  // Tüm kayıtlar tek listede tutulur; "kind" hangi sekmeye ait olduğunu belirtir
  const [parties, setParties] = useState<Customer[]>([
    ...initialCustomers,
    ...initialSuppliers,
  ]);
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  // Az önce eklenen kayıt; kendi listesinde vurgulanır
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

  /** Sekmeye geç: Müşteriler ana ekrandır, diğerleri kendi sayfasında açılır */
  function openTab(id: PartyKind) {
    go(id === "customer" ? { name: "home" } : { name: "group", id });
  }

  /** Yeni sekme oluştur ve doğrudan o sekmenin sayfasını aç */
  function createTab(name: string) {
    const group: Group = { id: `g${Date.now()}`, name };
    setGroups((prev) => [...prev, group]);
    go({ name: "group", id: group.id });
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
    if (view.name === "group" && view.id === id) setView({ name: "home" });
  }

  function go(next: View) {
    setAddedId(null);
    setView(next);
  }

  if (view.name === "new") {
    const kind = view.kind;
    const group = groups.find((g) => g.id === kind);
    const returnTo: View =
      kind === "customer" ? { name: "home" } : { name: "group", id: kind };
    return (
      <NewCustomerPage
        kind={kind}
        groupName={group?.name ?? ""}
        existingNames={membersOf(kind).map((p) => p.name)}
        onBack={() => setView(returnTo)}
        onSave={(party) => {
          setParties((prev) => [...prev, party]);
          setAddedId(party.id);
          setView(returnTo);
        }}
      />
    );
  }

  if (view.name === "party") {
    const party = parties.find((p) => p.id === view.id);
    if (party) {
      const fromGroup = view.fromGroup;
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
          onBack={() => openTab(fromGroup)}
        />
      );
    }
  }

  if (view.name === "group") {
    const group = groups.find((g) => g.id === view.id);
    if (group) {
      return (
        <GroupPage
          group={group}
          members={membersOf(group.id)}
          tabs={tabs}
          transactions={transactions}
          highlightId={addedId}
          onSelect={(id) => go({ name: "party", id, fromGroup: group.id })}
          onNew={() => go({ name: "new", kind: group.id })}
          onSelectTab={openTab}
          onCreateTab={createTab}
          onRenameTab={renameTab}
          onDeleteTab={deleteTab}
          onBack={() => go({ name: "home" })}
        />
      );
    }
  }

  return (
    <Dashboard
      customers={membersOf("customer")}
      tabs={tabs}
      transactions={transactions}
      highlightId={addedId}
      onSelectCustomer={(id) =>
        go({ name: "party", id, fromGroup: "customer" })
      }
      onNewCustomer={() => go({ name: "new", kind: "customer" })}
      onSelectTab={openTab}
      onCreateTab={createTab}
      onRenameTab={renameTab}
      onDeleteTab={deleteTab}
    />
  );
}
