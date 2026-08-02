import { ApiHealthCard } from '@/components/api-health-card';

const foundationItems = [
  'Unique pnpm workspace package names',
  'NestJS validation and consistent errors',
  'Request IDs, CORS, Helmet, and Swagger',
  'Separate development and test PostgreSQL',
  'Browser-safe shared types and UI package',
  'CI checks for format, lint, type-check, tests, and builds',
];

export default function HomePage() {
  return (
    <main>
      <div className="shell">
        <header className="hero">
          <p className="eyebrow">PROJECT VISIBILITY MVP</p>
          <h1>SaaS Command Center</h1>
          <p className="hero-copy">
            The foundation is ready for secure workspaces, application records, milestones,
            blockers, and evidence-based portfolio priorities.
          </p>
        </header>

        <ApiHealthCard />

        <section className="panel">
          <div className="panel-heading">
            <p className="eyebrow">PHASE 0–2</p>
            <h2>Foundation included</h2>
          </div>
          <ul>
            {foundationItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="next-step">
          <p className="eyebrow">NEXT IMPLEMENTATION</p>
          <h2>Database foundation</h2>
          <p>
            Add Prisma and the first ownership models: User, Workspace, WorkspaceMember, and
            AuthSession. Product features remain blocked until workspace isolation is proven.
          </p>
        </section>
      </div>
    </main>
  );
}
