import { Wrench } from "lucide-react"

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full"></div>
            <Wrench className="w-20 h-20 text-amber-500 relative" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Under Maintenance
        </h1>

        <p className="text-lg text-slate-600 mb-2">
          We're currently performing scheduled maintenance to improve Vaymo.
        </p>

        <p className="text-slate-500 mb-8">
          We'll be back shortly. Thank you for your patience.
        </p>

        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
          <span>Maintenance in progress</span>
        </div>
      </div>
    </div>
  )
}
