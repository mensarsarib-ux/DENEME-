import { useEffect, useState } from "react";
import Splash from "./components/Splash";
import Dashboard from "./components/Dashboard";
import CustomerPage from "./components/CustomerPage";
import NewCustomerPage from "./components/NewCustomerPage";
import SuppliersPage from "./components/SuppliersPage";
import {
  balanceOf,
  initialCustomers,
  initialSuppliers,
  initialTransactions,
  type Customer,
  type PartyKind,
  type Transaction,
} from "./data/mock";

// Açılış ekranı ne kadar görünsün (ms) ve çıkış animasyonunun süresi
const SPLASH_DURATION = 2200;
const SPLASH_EXIT = 400;

/** Açık olan ekran */
type View =
  | { name: "home" }
  | { name: "suppliers" }
  | { name: "party"; id: string; from: "home" | "suppliers" }
  | { name: "new"; kind: PartyKind };

export default function App() {
  const [phase, setPhase] = useState<"splash" | "exiting" | "home">("splash");
  const [view, setView] = useState<View>({ name: "home" });
  // Müşteriler ve tedarikçiler aynı listede tutulur; "kind" ile ayrılır
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

  const customers = parties.filter((p) => p.kind === "customer");
  const suppliers = parties.filter((p) => p.kind === "supplier");
  const customersSummary = {
    count: customers.length,
    total: customers.reduce((sum, c) => sum + balanceOf(transactions, c.id), 0),
  };

  function go(next: View) {
    setAddedId(null);
    setView(next);
  }

  if (view.name === "new") {
    const kind = view.kind;
    return (
      <NewCustomerPage
        kind={kind}
        existingNames={(kind === "customer" ? customers : suppliers).map(
          (p) => p.name,
        )}
        onBack={() => setView(kind === "customer" ? { name: "home" } : { name: "suppliers" })}
        onSave={(party) => {
          setParties((prev) => [...prev, party]);
          setAddedId(party.id);
          setView(kind === "customer" ? { name: "home" } : { name: "suppliers" });
        }}
      />
    );
  }

  if (view.name === "party") {
    const party = parties.find((p) => p.id === view.id);
    if (party) {
      const from = view.from;
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
          onBack={() => go({ name: from })}
        />
      );
    }
  }

  if (view.name === "suppliers") {
    return (
      <SuppliersPage
        suppliers={suppliers}
        customersSummary={customersSummary}
        transactions={transactions}
        highlightId={addedId}
        onSelect={(id) => go({ name: "party", id, from: "suppliers" })}
        onNew={() => go({ name: "new", kind: "supplier" })}
        onShowCustomers={() => go({ name: "home" })}
      />
    );
  }

  return (
    <Dashboard
      customers={customers}
      suppliers={suppliers}
      transactions={transactions}
      highlightId={addedId}
      onSelectCustomer={(id) => go({ name: "party", id, from: "home" })}
      onNewCustomer={() => go({ name: "new", kind: "customer" })}
      onOpenSuppliers={() => go({ name: "suppliers" })}
    />
  );
}
