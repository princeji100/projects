import HeroForm from "@/components/forms/HeroForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <main>
        <section className='max-w-4xl mx-auto px-6'>
          <div className='pt-16 md:pt-32 pb-12'>
            <div className='max-w-2xl mb-12'>
              <h1 className='text-5xl md:text-6xl font-bold text-slate-800 leading-tight'>
                Your one link{' '}
                <br className="hidden md:block" />
                for Everything
              </h1>
              <h2 className='text-slate-600 text-xl mt-6 leading-relaxed'>
                Share your links, social profiles, contact info and more on one page
              </h2>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <HeroForm />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}