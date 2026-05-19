export default function DocsPage() {
  return (
    <div className="px-6 pt-32 pb-24">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs font-medium text-white/30 tracking-[0.2em] uppercase mb-4">Docs</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter mb-6">Documentation</h1>
        <p className="text-lg text-white/40 mb-12">
          Get started with the localtools collection — currently <strong className="text-white/70">local-dns</strong> and <strong className="text-white/70">local-ssl</strong>, with more tools coming.
        </p>

        <div className="space-y-6">
          <DocCard
            title="local-dns"
            description="Local DNS management with profiles, wildcards, zones, and system detection. Route any domain to any IP on your local machine."
            href="/docs/local-dns"
            accent="#22d3ee"
            sections={['Installation', 'Quick start', 'Commands', 'Profiles', 'Zones & Groups']}
          />
          <DocCard
            title="local-ssl"
            description="Generate locally-trusted HTTPS certificates for development. Create a Certificate Authority and issue certs for any domain."
            href="/docs/local-ssl"
            accent="#34d399"
            sections={['Installation', 'Quick start', 'Commands', 'CA management', 'System trust']}
          />
        </div>
      </div>
    </div>
  )
}

function DocCard({ title, description, href, accent, sections }: {
  title: string
  description: string
  href: string
  accent: string
  sections: string[]
}) {
  return (
    <a href={href} className="group block p-1.5 rounded-[1.5rem] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.01]" style={{ background: `linear-gradient(135deg, ${accent}10, transparent 60%)` }}>
      <div className="rounded-[calc(1.5rem-0.375rem)] bg-[#0a0a14] p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${accent}15` }}>
            <div className="w-3 h-3 rounded-sm" style={{ background: accent }} />
          </div>
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        </div>
        <p className="text-sm text-white/50 mb-5 leading-relaxed">{description}</p>
        <div className="flex flex-wrap gap-2">
          {sections.map(s => (
            <span key={s} className="text-xs px-3 py-1 rounded-full border border-white/[0.04] bg-white/[0.02] text-white/40">
              {s}
            </span>
          ))}
        </div>
      </div>
    </a>
  )
}
