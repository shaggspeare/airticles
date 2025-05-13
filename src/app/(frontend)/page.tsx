import ArticleGenerator from "@/components/ArticleGenerator";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-12 bg-zinc-950">
      <div className="w-full max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-6 text-white">Article Generator</h1>
        <p className="text-center mb-10 text-zinc-400 text-lg max-w-2xl mx-auto">
          Click the button below to generate a Medium-style article using OpenAI
        </p>
        <ArticleGenerator />
      </div>
    </main>
  );
}
