import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "R$ 0",
    features: ["Até 2 projetos", "Membros ilimitados", "Tarefas ilimitadas"],
  },
  {
    name: "Pro",
    price: "R$ 29/mês",
    features: ["Projetos ilimitados", "Membros ilimitados", "Suporte prioritário"],
    highlight: true,
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Tarefas da sua equipe, num só lugar.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
          TaskFlow é um gerenciador de projetos simples para times pequenos.
          Crie sua organização, convide o time e comece a organizar.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
        >
          Começar grátis
        </Link>
      </section>

      <section className="mt-20 grid gap-6 sm:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-xl border bg-white p-6 ${
              plan.highlight ? "border-indigo-600 ring-1 ring-indigo-600" : "border-slate-200"
            }`}
          >
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-2 text-3xl font-bold">{plan.price}</p>
            <ul className="mt-4 space-y-2 text-slate-600">
              {plan.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
