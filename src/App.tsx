import { CalendarDays, Sparkles } from 'lucide-react'

function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-white
                     flex items-center justify-center p-6">
      <section className="max-w-xl text-center space-y-5">
        <div className="flex justify-center">
          <CalendarDays className="h-14 w-14 text-violet-400" />
        </div>

        <h1 className="text-5xl font-bold">
          EventFlowAI
        </h1>

        <p className="text-lg text-slate-300">
          AI-Powered Event Planning & Logistics Platform
        </p>

        <div className="flex items-center justify-center
                        gap-2 text-violet-300">
          <Sparkles size={20} />
          <span>Project Foundation Ready</span>
        </div>
      </section>
    </main>
  )
}

export default App
