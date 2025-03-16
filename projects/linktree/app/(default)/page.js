import HeroForm from "@/components/forms/HeroForm";

export default function Home() {
  return (
    <main>
      <section className='pt-32'>
        <div className='max-w-md mb-8'>

          <h1 className='text-6xl font-bold'>Your one link <br /> for Everything</h1>
          <h2 className='text-gray-400 text-xl mt-6'>Share your links, social profiles, contact info and more on one Page</h2>
        </div>
        <HeroForm />
      </section>
    </main>
  );
}
