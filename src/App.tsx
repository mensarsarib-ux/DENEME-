import { useEffect, useState } from "react";
import Splash from "./components/Splash";
import Dashboard from "./components/Dashboard";
import CustomerPage from "./components/CustomerPage";
import NewCustomerPage from "./components/NewCustomerPage";
import {
  initialCustomers,
  initialTransactions,
  type Customer,
  type Transaction,
} from "./data/mock";

// Açılış ekranı ne kadar görünsün (ms) ve çıkış animasyonunun süresi
const SPLASH_DURATION = 2200;
const SPLASH_EXIT = 400;

export default function App() {
  const [phase, setPhase] = useState<"splash" | "exiting" | "home">("splash");
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Az önce eklenen müşteri; ana ekranda vurgulanır
  const [addedId, setAddedId] = useState<string | null>(null);
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);

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

  if (phase === "home") {
    if (creating) {
      return (
        <NewCustomerPage
          existingNames={customers.map((c) => c.name)}
          onBack={() => setCreating(false)}
          onSave={(customer) => {
            setCustomers((prev) => [...prev, customer]);
            setCreating(false);
            setAddedId(customer.id);
          }}
        />
      );
    }

    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      return (
        <CustomerPage
          customer={customer}
          transactions={transactions}
          onAdd={(tx) => setTransactions((prev) => [...prev, tx])}
          onBack={() => setCustomerId(null)}
        />
      );
    }

    return (
      <Dashboard
        customers={customers}
        transactions={transactions}
        highlightId={addedId}
        onSelectCustomer={(id) => {
          setAddedId(null);
          setCustomerId(id);
        }}
        onNewCustomer={() => {
          setAddedId(null);
          setCreating(true);
        }}
      />
    );
  }

  return (
    <div className={`splash-wrap ${phase === "exiting" ? "is-exiting" : ""}`}>
      <Splash />
    </div>
  );
}
