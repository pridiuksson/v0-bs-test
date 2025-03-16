import { LogProvider } from "@/context/log-context"
import { AuthProvider } from "@/context/auth-context"
import NinePictureGridApp from "@/components/nine-picture-grid-app"
import DebugHelper from "@/components/debug-helper"

export default function Home() {
  return (
    <main className="min-h-screen p-6 md:p-12 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Nine Picture Grid with Text</h1>
        <LogProvider>
          <AuthProvider>
            <NinePictureGridApp />
            <DebugHelper />
          </AuthProvider>
        </LogProvider>
      </div>
    </main>
  )
}

