// ============================================================
// About Section – "Tentang QURTEK"
// Three-part informational section: Vision, Dalil, Technical USP
// ============================================================
"use client";

import { useState, useEffect } from "react";

/* ── Reveal-on-scroll animation hook ─────────────────────────── */
function useReveal(threshold = 0.15) {
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return { setRef, visible };
}

/* ── Animated section wrapper ────────────────────────────────── */
function RevealSection({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { setRef, visible } = useReveal(0.1);
  return (
    <div
      ref={setRef}
      className={`transition-all duration-700 ease-out ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── USP Feature Card ────────────────────────────────────────── */
function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: string;
  title: string;
  description: string;
  delay: number;
}) {
  const { setRef, visible } = useReveal(0.1);
  return (
    <div
      ref={setRef}
      className={`group relative bg-surface-container-lowest rounded-2xl p-8 transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(0,53,39,0.08)] overflow-hidden ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Decorative gradient accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary-fixed opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="w-14 h-14 rounded-2xl bg-primary-fixed/30 flex items-center justify-center mb-6 group-hover:bg-primary-fixed/50 transition-colors duration-300">
        <span
          className="material-symbols-outlined text-primary text-2xl transition-transform duration-300 group-hover:scale-110"
          style={{ fontVariationSettings: '"FILL" 1' }}
        >
          {icon}
        </span>
      </div>
      <h4 className="font-headline text-lg font-bold text-primary mb-3">
        {title}
      </h4>
      <p className="text-sm text-on-surface-variant leading-relaxed">
        {description}
      </p>
    </div>
  );
}

/* ── Step Card (for Process section) ─────────────────────────── */
function ProcessStep({
  step,
  icon,
  title,
  description,
  delay,
}: {
  step: number;
  icon: string;
  title: string;
  description: string;
  delay: number;
}) {
  const { setRef, visible } = useReveal(0.1);
  return (
    <div
      ref={setRef}
      className={`flex gap-6 items-start transition-all duration-600 ease-out ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Step number + connector */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-black text-lg shadow-md">
          {step}
        </div>
        {step < 4 && (
          <div className="w-0.5 h-16 bg-gradient-to-b from-primary/40 to-transparent mt-2" />
        )}
      </div>
      {/* Content */}
      <div className="pt-1 pb-8">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="material-symbols-outlined text-primary text-xl"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            {icon}
          </span>
          <h4 className="font-headline text-base font-bold text-primary">
            {title}
          </h4>
        </div>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

// ── Main About Section ────────────────────────────────────────
export default function AboutSection() {
  return (
    <div className="space-y-20">
      {/* ═══════════════════════════════════════════════════════
          SECTION 1: Visi & Filosofi
          ═══════════════════════════════════════════════════════ */}
      <RevealSection>
        <section id="about-visi" className="relative">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-8">
            <span className="w-8 h-0.5 bg-primary rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
              Visi & Filosofi
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left: Headline */}
            <div className="lg:col-span-2">
              <h2 className="font-headline text-4xl md:text-5xl font-black text-primary leading-tight">
                Mengapa Pilih{" "}
                <span className="italic text-secondary">Qurban</span>{" "}
                <br className="hidden md:block" />
                di Al-Mustadam?
              </h2>
            </div>

            {/* Right: Body text */}
            <div className="lg:col-span-3 space-y-6">
              <p className="text-lg text-on-surface leading-relaxed">
                <span className="font-bold text-primary">QURTEK</span>{" "}
                hadir sebagai jembatan bagi civitas akademika FT UGM dan
                masyarakat umum untuk menunaikan ibadah Qurban dengan sistem
                yang{" "}
                <span className="font-semibold text-primary">transparan</span>,{" "}
                <span className="font-semibold text-primary">amanah</span>, dan{" "}
                <span className="font-semibold text-primary">
                  terorganisir secara teknis
                </span>
                .
              </p>
              <p className="text-base text-on-surface-variant leading-relaxed">
                Dikelola oleh Masjid Al-Mustadam, Fakultas Teknik Universitas
                Gadjah Mada, kegiatan ini lahir dari semangat untuk memadukan
                nilai-nilai ibadah dengan prinsip profesionalitas dan
                akuntabilitas. Kami percaya bahwa ibadah qurban—sebagai salah
                satu syiar Islam terbesar—layak dikelola dengan standar terbaik,
                sehingga setiap shohibul qurban dapat menjalankan ibadah dengan
                penuh ketenangan dan keyakinan.
              </p>

              {/* Value pills */}
              <div className="flex flex-wrap gap-3 pt-2">
                {[
                  { icon: "verified_user", text: "Transparan" },
                  { icon: "handshake", text: "Amanah" },
                  { icon: "engineering", text: "Terorganisir" },
                  { icon: "eco", text: "Berkelanjutan" },
                ].map(({ icon, text }) => (
                  <span
                    key={text}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-fixed/20 rounded-full text-xs font-bold text-primary"
                  >
                    <span
                      className="material-symbols-outlined text-sm"
                      style={{ fontVariationSettings: '"FILL" 1' }}
                    >
                      {icon}
                    </span>
                    {text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2: Dalil Al-Qur'an (Al-Kautsar: 2)
          ═══════════════════════════════════════════════════════ */}
      <RevealSection delay={100}>
        <section
          id="about-dalil"
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-primary-container arabesque-pattern" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-container via-primary-container/95 to-primary/80" />

          <div className="relative z-10 px-8 py-16 md:px-16 md:py-20 text-center">
            {/* Surah label */}
            <div className="inline-flex items-center gap-2 px-5 py-1.5 bg-white/10 rounded-full mb-10 backdrop-blur-sm">
              <span
                className="material-symbols-outlined text-primary-fixed text-sm"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                menu_book
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-fixed">
                Surah Al-Kautsar · Ayat 2
              </span>
            </div>

            {/* Arabic text */}
            <blockquote className="mb-8">
              <p
                className="text-4xl md:text-5xl lg:text-6xl leading-loose text-on-primary font-medium"
                style={{
                  fontFamily: "'Noto Naskh Arabic', 'Amiri', serif",
                  direction: "rtl",
                }}
              >
                فَصَلِّ لِرَبِّكَ وَٱنۡحَرۡ
              </p>
            </blockquote>

            {/* Transliteration */}
            <p className="text-sm md:text-base font-semibold text-primary-fixed/80 italic mb-4 tracking-wide">
              &ldquo;Fa shalli li rabbika wanhar&rdquo;
            </p>

            {/* Translation */}
            <p className="text-base md:text-lg text-primary-fixed font-medium max-w-2xl mx-auto leading-relaxed">
              &ldquo;Maka shalatlah untuk Tuhanmu dan berkurbanlah.&rdquo;
            </p>

            {/* Separator */}
            <div className="flex items-center justify-center gap-4 mt-10">
              <span className="w-12 h-0.5 bg-primary-fixed/30 rounded-full" />
              <span
                className="material-symbols-outlined text-primary-fixed/40 text-xl"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                star
              </span>
              <span className="w-12 h-0.5 bg-primary-fixed/30 rounded-full" />
            </div>

            <p className="mt-6 text-sm text-primary-fixed/60 max-w-lg mx-auto leading-relaxed">
              Ayat ini menjadi landasan utama pelaksanaan ibadah qurban—sebuah
              perintah langsung dari Allah SWT untuk mendekatkan diri
              kepada-Nya melalui shalat dan penyembelihan hewan qurban.
            </p>
          </div>
        </section>
      </RevealSection>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3: "Teknik" di Balik Qurban (USP)
          ═══════════════════════════════════════════════════════ */}
      <RevealSection delay={200}>
        <section id="about-teknik">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-0.5 bg-secondary rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-secondary">
              Keunggulan Kami
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
            <div className="max-w-xl">
              <h2 className="font-headline text-3xl md:text-4xl font-black text-primary leading-tight mb-4">
                &ldquo;Teknik&rdquo; di Balik{" "}
                <span className="italic text-secondary">Qurban</span>
              </h2>
              <p className="text-base text-on-surface-variant leading-relaxed">
                Diselenggarakan oleh Fakultas Teknik UGM, kami menerapkan
                pendekatan teknis dan manajemen profesional yang membedakan
                QURTEK dari panitia qurban pada umumnya.
              </p>
            </div>
            {/* Decorative badge */}
            <div className="flex items-center gap-2 px-5 py-2.5 bg-secondary-container rounded-2xl shrink-0">
              <span
                className="material-symbols-outlined text-on-secondary-container"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                school
              </span>
              <span className="text-xs font-black text-on-secondary-container uppercase tracking-wider">
                FT UGM Standard
              </span>
            </div>
          </div>

          {/* ── Feature Cards Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <FeatureCard
              icon="monitor_heart"
              title="Sistem Digital & Real-Time"
              description="Website Qurtek memungkinkan pemantauan status hewan qurban secara langsung. Data diperbarui real-time dari lapangan, sehingga shohibul qurban dapat mengetahui perkembangan terkini tanpa perlu hadir di lokasi."
              delay={0}
            />
            <FeatureCard
              icon="analytics"
              title="Transparansi Data Terintegrasi"
              description="Laporan yang terstruktur dan terintegrasi melalui spreadsheet dan sistem database. Setiap shohibul qurban dapat melihat status hewan mereka—mulai dari persiapan, penyembelihan, pengolahan, hingga distribusi."
              delay={150}
            />
            <FeatureCard
              icon="verified"
              title="Standar Operasional Terukur"
              description="Pengelolaan sistematis yang mencakup pemilihan hewan sesuai syariat, penyembelihan yang higienis dengan pengawasan ahli, serta distribusi yang tepat sasaran dan terdokumentasi dengan baik."
              delay={300}
            />
          </div>

          {/* ── Process Timeline ── */}
          <div className="bg-surface-container-low rounded-3xl p-8 md:p-12">
            <div className="flex items-center gap-3 mb-10">
              <span
                className="material-symbols-outlined text-primary text-xl"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                route
              </span>
              <h3 className="font-headline text-xl font-bold text-primary">
                Alur Operasional
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
              <div>
                <ProcessStep
                  step={1}
                  icon="fact_check"
                  title="Seleksi & Verifikasi Hewan"
                  description="Pemilihan hewan qurban berdasarkan standar syariat Islam, meliputi usia, kesehatan, dan kelayakan fisik. Setiap hewan diverifikasi oleh tim ahli sebelum diterima."
                  delay={0}
                />
                <ProcessStep
                  step={2}
                  icon="content_cut"
                  title="Penyembelihan Higienis"
                  description="Pelaksanaan penyembelihan sesuai tuntunan syariat dengan standar kebersihan tinggi. Dilakukan oleh penyembelih berpengalaman dengan pengawasan dokter hewan."
                  delay={100}
                />
              </div>
              <div>
                <ProcessStep
                  step={3}
                  icon="precision_manufacturing"
                  title="Pengolahan Terstruktur"
                  description="Proses pemotongan dan pengemasan daging yang terorganisir dengan pembagian merata. Setiap paket daging ditimbang dan dicatat secara akurat dalam sistem."
                  delay={200}
                />
                <ProcessStep
                  step={4}
                  icon="local_shipping"
                  title="Distribusi Tepat Sasaran"
                  description="Pendistribusian daging qurban yang terdokumentasi dengan pemetaan penerima manfaat. Laporan distribusi tersedia secara real-time di website Qurtek."
                  delay={300}
                />
              </div>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── Coming Soon Teaser ── */}
      <RevealSection delay={100}>
        <div className="flex items-center gap-4 p-6 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/50">
          <span className="material-symbols-outlined text-outline text-2xl">
            construction
          </span>
          <div>
            <p className="text-sm font-bold text-on-surface-variant">
              Segera Hadir
            </p>
            <p className="text-xs text-outline">
              Informasi lokasi distribusi, peta penerima manfaat, dan
              dokumentasi kegiatan akan ditambahkan dalam pembaruan
              selanjutnya.
            </p>
          </div>
        </div>
      </RevealSection>
    </div>
  );
}
