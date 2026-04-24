import FormUI from './FormUI';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-6">AI 健康食品成分助手 Demo</h1>
      <FormUI />
    </main>
  );
}
